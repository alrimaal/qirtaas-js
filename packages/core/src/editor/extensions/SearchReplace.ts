// Based on tiptap-search-and-replace by Jeet Mandaliya (MIT License)
// Adapted for TipTap v3

import type { Range } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { parseReplacementText } from "./Honorific";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface SearchReplaceOptions {
  searchResultClass: string;
}

export interface SearchReplaceStorage {
  searchTerm: string;
  replaceTerm: string;
  results: Range[];
  lastSearchTerm: string;
  caseSensitive: boolean;
  lastCaseSensitive: boolean;
  resultIndex: number;
  lastResultIndex: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchAndReplace: {
      setSearchTerm: (searchTerm: string) => ReturnType;
      setReplaceTerm: (replaceTerm: string) => ReturnType;
      setCaseSensitive: (caseSensitive: boolean) => ReturnType;
      resetIndex: () => ReturnType;
      nextSearchResult: () => ReturnType;
      previousSearchResult: () => ReturnType;
      replace: () => ReturnType;
      replaceAll: () => ReturnType;
    };
  }
}

interface TextNodesWithPosition {
  text: string;
  pos: number;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function processSearches(
  doc: PMNode,
  searchTerm: string,
  searchResultClass: string,
  resultIndex: number,
  caseSensitive: boolean,
): { decorations: DecorationSet; results: Range[] } {
  const results: Range[] = [];

  if (!searchTerm) {
    return { decorations: DecorationSet.empty, results: [] };
  }

  const regex = new RegExp(escapeRegex(searchTerm), caseSensitive ? "gu" : "gui");

  const textNodesWithPosition: TextNodesWithPosition[] = [];
  let index = 0;

  doc.descendants((node, pos) => {
    if (node.isText) {
      if (textNodesWithPosition[index]) {
        textNodesWithPosition[index] = {
          text: textNodesWithPosition[index]!.text + node.text,
          pos: textNodesWithPosition[index]!.pos,
        };
      } else {
        textNodesWithPosition[index] = {
          text: `${node.text}`,
          pos,
        };
      }
    } else {
      index += 1;
    }
  });

  for (const { text, pos } of textNodesWithPosition.filter(Boolean)) {
    const matches = Array.from(text.matchAll(regex)).filter(
      ([matchText]) => matchText.trim(),
    );

    for (const m of matches) {
      if (m[0] === "" || m.index === undefined) break;
      results.push({
        from: pos + m.index,
        to: pos + m.index + m[0].length,
      });
    }
  }

  const decorations: Decoration[] = results.map((r, i) => {
    const className =
      i === resultIndex
        ? `${searchResultClass} ${searchResultClass}-current`
        : searchResultClass;
    return Decoration.inline(r.from, r.to, { class: className });
  });

  return {
    decorations: DecorationSet.create(doc, decorations),
    results,
  };
}

export const searchReplacePluginKey = new PluginKey("searchReplace");

export const SearchReplace = Extension.create<
  SearchReplaceOptions,
  SearchReplaceStorage
>({
  name: "searchAndReplace",

  addOptions() {
    return {
      searchResultClass: "search-result",
    };
  },

  addStorage() {
    return {
      searchTerm: "",
      replaceTerm: "",
      results: [],
      lastSearchTerm: "",
      caseSensitive: false,
      lastCaseSensitive: false,
      resultIndex: 0,
      lastResultIndex: 0,
    };
  },

  addCommands() {
    return {
      setSearchTerm:
        (searchTerm: string) =>
        ({ editor }) => {
          const storage = (editor.storage as any).searchAndReplace as SearchReplaceStorage;
          storage.searchTerm = searchTerm;
          storage.resultIndex = 0;
          return false;
        },
      setReplaceTerm:
        (replaceTerm: string) =>
        ({ editor }) => {
          ((editor.storage as any).searchAndReplace as SearchReplaceStorage).replaceTerm = replaceTerm;
          return false;
        },
      setCaseSensitive:
        (caseSensitive: boolean) =>
        ({ editor }) => {
          const storage = (editor.storage as any).searchAndReplace as SearchReplaceStorage;
          storage.caseSensitive = caseSensitive;
          storage.resultIndex = 0;
          return false;
        },
      resetIndex:
        () =>
        ({ editor }) => {
          ((editor.storage as any).searchAndReplace as SearchReplaceStorage).resultIndex = 0;
          return false;
        },
      nextSearchResult:
        () =>
        ({ editor }) => {
          const storage = (editor.storage as any).searchAndReplace as SearchReplaceStorage;
          const { results, resultIndex } = storage;
          if (!results.length) return false;
          const nextIndex = resultIndex + 1;
          storage.resultIndex =
            nextIndex < results.length ? nextIndex : 0;
          return false;
        },
      previousSearchResult:
        () =>
        ({ editor }) => {
          const storage = (editor.storage as any).searchAndReplace as SearchReplaceStorage;
          const { results, resultIndex } = storage;
          if (!results.length) return false;
          const prevIndex = resultIndex - 1;
          storage.resultIndex =
            prevIndex >= 0 ? prevIndex : results.length - 1;
          return false;
        },
      replace:
        () =>
        ({ editor, state, dispatch }) => {
          const { replaceTerm, results, resultIndex } =
            (editor.storage as any).searchAndReplace as SearchReplaceStorage;
          const result = results[resultIndex];
          if (!result) return false;
          if (dispatch) {
            const fragment = parseReplacementText(replaceTerm, state.schema);
            dispatch(state.tr.replaceWith(result.from, result.to, fragment));
          }
          return false;
        },
      replaceAll:
        () =>
        ({ editor, tr, dispatch }) => {
          const { replaceTerm, results } = (editor.storage as any).searchAndReplace as SearchReplaceStorage;
          if (!results.length) return false;

          const fragment = parseReplacementText(replaceTerm, tr.doc.type.schema);
          let offset = 0;
          for (const { from, to } of results) {
            tr.replaceWith(from - offset, to - offset, fragment);
            offset += (to - from) - fragment.size;
          }

          if (dispatch) dispatch(tr);
          return false;
        },
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const { searchResultClass } = this.options;

    return [
      new Plugin({
        key: searchReplacePluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply({ doc, docChanged }, oldState) {
            const storage = (editor.storage as any).searchAndReplace as SearchReplaceStorage;
            const {
              searchTerm,
              lastSearchTerm,
              caseSensitive,
              lastCaseSensitive,
              resultIndex,
              lastResultIndex,
            } = storage;

            if (
              !docChanged &&
              lastSearchTerm === searchTerm &&
              lastCaseSensitive === caseSensitive &&
              lastResultIndex === resultIndex
            )
              return oldState;

            storage.lastSearchTerm = searchTerm;
            storage.lastCaseSensitive = caseSensitive;
            storage.lastResultIndex = resultIndex;

            if (!searchTerm) {
              storage.results = [];
              return DecorationSet.empty;
            }

            const { decorations, results } = processSearches(
              doc,
              searchTerm,
              searchResultClass,
              resultIndex,
              caseSensitive,
            );

            storage.results = results;
            return decorations;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
