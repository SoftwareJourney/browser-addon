<template>
    <div id="searchPanel" class="pb-6 pt-0 pr-0">
        <v-divider v-show="filteredMatches && filteredMatches.length > 0" />

        <!-- prettier-ignore -->
        <Entry
            v-for="(match, index) of filteredMatches"
            :key="match.entry.uuid"
            ref="listAarray"
            :entrySummary="match.entry"
            :isFirstInAList="index === 0"
            :frame-id="frame-id"
            :entry-index="match.originalIndex"
            :data-index="index"
            @move-next-in-list="
                nextInList(index, 'listAarray', filteredMatches.length)
            "
            @move-prev-in-list="
                prevInList(index, 'listAarray', filteredMatches.length)
            "
            @move-out-of-list="exitList"
            v-on="$listeners"
        />

        <v-divider
            v-show="deduplicatedSearchResults && deduplicatedSearchResults.length > 0"
            class="mt-2"
        />
        <v-subheader
            v-show="deduplicatedSearchResults && deduplicatedSearchResults.length > 0"
            class="text-center"
            style="justify-content: center"
        >
            {{ $i18n("matches_from_other_sites") }}
        </v-subheader>

        <Entry
            v-for="(entry, index) of deduplicatedSearchResults"
            :key="entry.uuid"
            ref="listBarray"
            :entrySummary="entry"
            :isFirstInAList="index === 0"
            :data-index="index"
            @move-next-in-list="nextInList(index, 'listBarray', deduplicatedSearchResults.length)"
            @move-prev-in-list="prevInList(index, 'listBarray', deduplicatedSearchResults.length)"
            @move-out-of-list="exitList"
        />
    </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from "vuex";
import { names as actionNames } from "../../store/action-names";
import Entry from "./Entry.vue";
import { mTypes } from "../../store";
import { KeeLog } from "../../common/Logger";
import { EntrySummary } from "../../common/model/EntrySummary";
import { Entry as ModelEntry } from "../../common/model/Entry";
import { SearcherMatchedOnly } from "../../common/SearcherMatchedOnly";

export default {
    components: { Entry },
    props: ["matchedEntries", "frameId"],
    data() {
        return {
            filteredMatches: null,
            uidMap: new Map<string, number>()
        };
    },
    computed: {
        ...mapGetters(["currentSearchTerm", "searchResults"]),
        deduplicatedSearchResults: function (this: any) {
            if (this.searchResults) {
                if (this.matchedEntries) {
                    return this.searchResults.filter(
                        e => !this.matchedEntries.some(m => m.uuid === e.uuid)
                    );
                } else {
                    return this.searchResults;
                }
            }
            return null;
        }
    },
    watch: {
        matchedEntries: function (this: any, newVal) {
            this.initAndSearchMatchedEntries(newVal);
        }
    },
    created(this: any) {
        this.initAndSearchMatchedEntries(this.matchedEntries);
    },
    mounted(this: any) {
        this.$store.subscribe(mutation => {
            if (mutation.type === mTypes.updateCurrentSearchTerm) {
                this.searchOnlyMatches.execute(
                    this.currentSearchTerm,
                    (this as any).onSearchOnlyMatchesComplete.bind(this)
                );
            }
        });
    },
    methods: {
        ...mapActions(actionNames),
        onSearchOnlyMatchesComplete(this: any, entrySummaries: EntrySummary[]) {
            KeeLog.debug("onSearchOnlyMatchesComplete");
            entrySummaries = entrySummaries.sort(function (a, b) {
                if (a.relevanceScore > b.relevanceScore) return -1;
                if (a.relevanceScore < b.relevanceScore) return 1;
                return 0;
            });
            this.filteredMatches = entrySummaries.map(m => ({
                entry: m,
                originalIndex: this.uidMap.get(m.uuid)
            }));
        },
        nextInList(this: any, currentIndex: number, listName: string, listLength: any) {
            const currentVueNode = this.$refs[listName].find(
                e => parseInt(e.$el.dataset.index) === currentIndex
            );
            if (currentIndex < listLength - 1) {
                currentVueNode.$el.nextElementSibling.focus();
            } else if (listName === "listAarray" && this.deduplicatedSearchResults.length > 0) {
                const firstBListVueNode = this.$refs["listBarray"].find(
                    e => parseInt(e.$el.dataset.index) === 0
                );
                firstBListVueNode.$el.focus();
            }
        },
        prevInList(this: any, currentIndex: number, listName: string) {
            const currentVueNode = this.$refs[listName].find(
                e => parseInt(e.$el.dataset.index) === currentIndex
            );
            if (currentIndex > 0) {
                currentVueNode.$el.previousElementSibling.focus();
            } else if (listName === "listBarray" && this.filteredMatches.length > 0) {
                const lastAListVueNode = this.$refs["listAarray"].find(
                    e => parseInt(e.$el.dataset.index) === this.filteredMatches.length - 1
                );
                lastAListVueNode.$el.focus();
            } else {
                (document.getElementById("searchBox") as HTMLInputElement).focus();
            }
        },
        exitList(this: any) {
            (document.getElementById("searchBox") as HTMLInputElement).focus();
        },
        initAndSearchMatchedEntries(this: any, matchedEntries: ModelEntry[]) {
            if (matchedEntries) {
                for (let i = 0; i < matchedEntries.length; i++) {
                    this.uidMap.set(matchedEntries[i].uuid, matchedEntries[i].entryIndex);
                }
            }
            this.searchOnlyMatches = new SearcherMatchedOnly(
                matchedEntries?.map(e => EntrySummary.fromEntry(e))
            );
            this.searchOnlyMatches.execute(
                this.currentSearchTerm,
                (this as any).onSearchOnlyMatchesComplete.bind(this)
            );
        }
    }
};
</script>
