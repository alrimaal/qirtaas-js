import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { VueRenderer } from "@tiptap/vue-3";
import {
  SURAHS,
  getVerseDetail,
  toLatinDigits,
  type SurahInfo,
  type VerseDetail,
} from "@qirtaas/core/services/quran";
import { getOverlayTarget } from "../../mount/overlay";
import QuranRefMenu from "../QuranRefMenu.vue";

const QuranReferencePluginKey = new PluginKey("quranReference");

/** Verse the host inserts; mirrors `insertQuranVerse` in DocumentEditor. */
export interface QuranReferenceInsert {
  surah: number;
  ayah: number;
  fromAyah: null;
  toAyah: null;
  fromWord: null;
  toWord: null;
  surahNameArabic: string;
  surahNameEnglish: string;
  text: string;
  displayMode: "inline";
}

/**
 * How far the query has got. `null` (no match at all) means `@` is being used
 * for something else — a handle, an email — so the popup stays hidden.
 */
type RefMatch =
  /** Bare `@`: nothing typed yet, so teach the syntax. */
  | { kind: "prompt" }
  /** `@24` or `@24:`: surah known, ayah still missing. */
  | { kind: "surah"; info: SurahInfo; hasColon: boolean }
  /** `@24:30`: a complete reference. */
  | { kind: "verse"; surah: number; ayah: number; info: SurahInfo };

type VerseMatch = Extract<RefMatch, { kind: "verse" }>;
type SelectedVerse = VerseMatch & { detail: VerseDetail };

/** What the query names so far. Accepts Arabic-Indic digits. */
function parseRef(query: string): RefMatch | null {
  if (query === "") return { kind: "prompt" };
  const match = /^(\d{1,3})(:(\d{0,3}))?$/.exec(toLatinDigits(query));
  if (!match) return null;
  const info = SURAHS[Number(match[1]) - 1];
  if (!info) return null;
  if (!match[3]) return { kind: "surah", info, hasColon: Boolean(match[2]) };
  const ayah = Number(match[3]);
  if (ayah < 1 || ayah > info.verse_count) return null;
  return { kind: "verse", surah: info.number, ayah, info };
}

export const QuranReference = Extension.create({
  name: "quranReference",

  addOptions() {
    return {
      locale: "en" as string,
      translate: ((key: string) => key) as (key: string) => string,
      onInsert: ((_data: QuranReferenceInsert) => {}) as (
        data: QuranReferenceInsert
      ) => void,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const { locale, translate, onInsert } = this.options;
    const surahName = (info: SurahInfo) =>
      locale.startsWith("ar") ? info.name_arabic : info.name_english;

    /**
     * The popup's two static lines, for every state. Everything here is known
     * locally from `SURAHS` — only a `verse` match needs the network, and its
     * text arrives later (see `lookup`).
     */
    function describe(match: RefMatch): { reference: string; hint: string } {
      switch (match.kind) {
        case "prompt":
          return {
            reference: translate("quran.refPromptTitle"),
            hint: translate("quran.refPromptHint"),
          };
        case "surah":
          return {
            reference: `${surahName(match.info)} · 1–${match.info.verse_count}`,
            hint: translate(
              match.hasColon ? "quran.refTypeVerse" : "quran.refEnterForVerse"
            ),
          };
        case "verse":
          return {
            reference: `${surahName(match.info)} · ${match.surah}:${
              match.ayah
            }`,
            hint: "",
          };
      }
    }

    return [
      // The popup is a single card rather than a list, so the query is parsed
      // in `update` below and the plugin's `items` list goes unused.
      Suggestion<never, SelectedVerse>({
        pluginKey: QuranReferencePluginKey,
        editor: this.editor,
        char: "@",
        render: () => {
          let tippyInstance: TippyInstance | null = null;
          let renderer: VueRenderer | null = null;
          let commandCallback: ((item: SelectedVerse) => void) | null = null;
          let match: RefMatch | null = null;
          /** Loaded verse for `match`; Enter only inserts once this is set. */
          let detail: VerseDetail | null = null;
          /** The query `match` came from, so a re-render for the same one is free. */
          let renderedQuery: string | null = null;
          let lookupTimer: ReturnType<typeof setTimeout> | undefined;
          /** Bumped per lookup so a slow reply can't overwrite a newer one. */
          let lookupId = 0;
          // The card's props. An empty reference renders nothing (tippy
          // carries no styling of its own), which is how "no match" shows
          // no popup.
          const card = {
            reference: "",
            hint: "",
            text: null as string | null,
            error: null as string | null,
          };

          const paint = () => renderer?.updateProps(card);

          /** Fills in the verse text `describe` can't know without the API. */
          function lookup(verse: VerseMatch) {
            const id = ++lookupId;
            lookupTimer = setTimeout(async () => {
              try {
                const loaded = await getVerseDetail(
                  verse.surah,
                  verse.ayah,
                  locale
                );
                if (id !== lookupId) return;
                detail = loaded;
                card.text = loaded.arabic_text;
                card.hint = translate("quran.refEnterToInsert");
                paint();
              } catch {
                if (id !== lookupId) return;
                card.error = translate("quran.previewError");
                paint();
              }
            }, 200);
          }

          function update(query: string) {
            // The plugin also re-renders when the `@` shifts position (an edit
            // above it) — same query, so keep the card and its loaded verse.
            if (query === renderedQuery) return;
            renderedQuery = query;

            clearTimeout(lookupTimer);
            lookupId++;
            match = parseRef(query);
            detail = null;
            card.text = null;
            card.error = null;
            Object.assign(
              card,
              match ? describe(match) : { reference: "", hint: "" }
            );
            paint();

            if (match?.kind === "verse") lookup(match);
          }

          /** Enter/click: finish the reference, or insert the loaded verse. */
          function activate(): boolean {
            switch (match?.kind) {
              case "surah":
                if (match.hasColon) return false;
                editor.chain().focus().insertContent(":").run();
                return true;
              case "verse":
                if (!detail) return false;
                commandCallback?.({ ...match, detail });
                return true;
              default:
                return false;
            }
          }

          return {
            onStart: (props) => {
              // VueRenderer (not createApp) so the card inherits the host
              // app's context — i18n, PrimeVue, provides — via editor.appContext.
              renderer = new VueRenderer(QuranRefMenu, {
                editor,
                props: { ...card, onSelect: activate },
              });

              commandCallback = props.command;
              update(props.query);

              tippyInstance = tippy(document.body, {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => getOverlayTarget(),
                // `el` is the always-present wrapper; `element` would be null
                // whenever the card's root `v-if` renders nothing.
                content: renderer.el as Element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },

            onUpdate: (props) => {
              commandCallback = props.command;
              update(props.query);
              if (tippyInstance && props.clientRect) {
                tippyInstance.setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              }
            },

            onKeyDown: ({ event }) => {
              if (event.key === "Escape") {
                tippyInstance?.hide();
                return true;
              }
              // Enter falls through to the editor while a lookup is pending or
              // failed, so a slow network never eats the user's newline.
              if (event.key === "Enter") return activate();
              return false;
            },

            onExit: () => {
              clearTimeout(lookupTimer);
              lookupId++;
              tippyInstance?.destroy();
              renderer?.destroy();
              tippyInstance = null;
              renderer = null;
              commandCallback = null;
              match = null;
              detail = null;
              renderedQuery = null;
            },
          };
        },
        command: ({ editor: ed, range, props }) => {
          ed.chain().focus().deleteRange(range).run();
          onInsert({
            surah: props.surah,
            ayah: props.ayah,
            fromAyah: null,
            toAyah: null,
            fromWord: null,
            toWord: null,
            surahNameArabic: props.detail.surah_name_arabic,
            surahNameEnglish: props.detail.surah_name_english,
            text: props.detail.arabic_text,
            displayMode: "inline",
            isRef: true,
          });
        },
      }),
    ];
  },
});
