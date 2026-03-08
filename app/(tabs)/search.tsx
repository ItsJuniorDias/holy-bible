import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Text from "@/components/text";

export default function SearchScreen() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch() {
    if (!searchQuery.trim()) return;

    Keyboard.dismiss();
    setIsSearching(true);
    setHasSearched(true);
    setSearchResults([]);

    try {
      // Dispara as buscas em Português e Inglês simultaneamente
      const [responsePt, responseEn] = await Promise.all([
        fetch("https://bible-api.com/JHN1?translation=almeida"),
        fetch("https://bible-api.com/JHN1?translation=kjv"), // King James Version
      ]);

      let combinedResults = [];

      // Processa os resultados em Português (Almeida)
      if (responsePt.ok) {
        const dataPt = await responsePt.json();
        const filteredPt = dataPt.verses.filter((v) =>
          v.text.toLowerCase().includes(searchQuery.toLowerCase()),
        );
        const formattedPt = filteredPt.map((v) => ({
          id: `pt-${v.chapter}:${v.verse}`,
          chapter: String(v.chapter),
          verse: String(v.verse),
          text: v.text,
          lang: "PT",
          translation: "almeida", // Guardamos a tradução para passar na rota
        }));
        combinedResults = [...combinedResults, ...formattedPt];
      }

      // Processa os resultados em Inglês (KJV)
      if (responseEn.ok) {
        const dataEn = await responseEn.json();
        const filteredEn = dataEn.verses.filter((v) =>
          v.text.toLowerCase().includes(searchQuery.toLowerCase()),
        );
        const formattedEn = filteredEn.map((v) => ({
          id: `en-${v.chapter}:${v.verse}`,
          chapter: String(v.chapter),
          verse: String(v.verse),
          text: v.text,
          lang: "EN",
          translation: "kjv", // Guardamos a tradução para passar na rota
        }));
        combinedResults = [...combinedResults, ...formattedEn];
      }

      // Ordena os resultados para manter a ordem dos versículos (ex: 1:1, 1:2...)
      combinedResults.sort((a, b) => {
        if (a.chapter !== b.chapter)
          return Number(a.chapter) - Number(b.chapter);
        return Number(a.verse) - Number(b.verse);
      });

      setSearchResults(combinedResults);
    } catch (error) {
      console.error("Erro na pesquisa:", error);
    } finally {
      setIsSearching(false);
    }
  }

  const renderItem = ({ item, index }) => {
    const isFirst = index === 0;
    const isLast = index === searchResults.length - 1;

    return (
      <TouchableOpacity
        style={[
          styles.resultItem,
          isFirst && styles.resultItemFirst,
          isLast && styles.resultItemLast,
        ]}
        activeOpacity={0.6}
        onPress={() => {
          // Navega passando a tradução correta que foi clicada!
          router.push({
            pathname: "/(tabs)/chapter",
            params: {
              chapter: item.chapter,
              language: item.translation,
            },
          });
        }}
      >
        <Text style={styles.verseLabel}>
          {item.lang === "PT" ? "João" : "John"} {item.chapter}:{item.verse} •{" "}
          {item.lang}
        </Text>
        <Text style={styles.verseText} numberOfLines={2}>
          {item.text.trim()}
        </Text>
        {!isLast && <View style={styles.separator} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.container}>
        <View style={styles.header}>
          <Text weight="medium" style={styles.headerTitle}>
            Pesquisar
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBarBackground}>
            <Ionicons
              name="search"
              size={20}
              color="#8E8E93"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar palavra (Ex: amor, love)"
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
            >
              <Text style={styles.searchButtonText}>Buscar</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.resultsContainer}>
          {isSearching ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#8E8E93" />
            </View>
          ) : hasSearched && searchResults.length === 0 ? (
            <View style={styles.centerContent}>
              <Text style={styles.feedbackTitle}>Nenhum Resultado</Text>
              <Text style={styles.feedbackText}>
                Verifique a ortografia ou tente {"\n"}uma palavra diferente.
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... seus estilos permanecem exatamente os mesmos!
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    paddingTop: 64,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: 0.3,
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: "center",
  },
  searchBarBackground: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(118, 118, 128, 0.12)",
    borderRadius: 10,
    height: 36,
    paddingHorizontal: 8,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: "#000000",
    height: "100%",
  },
  searchButton: {
    marginLeft: 12,
    justifyContent: "center",
  },
  searchButtonText: {
    color: "#007AFF",
    fontSize: 17,
  },
  resultsContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  resultItem: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  resultItemFirst: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  resultItemLast: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#C6C6C8",
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 0,
  },
  verseLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  verseText: {
    fontSize: 17,
    color: "#000000",
    lineHeight: 22,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: -100,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
});
