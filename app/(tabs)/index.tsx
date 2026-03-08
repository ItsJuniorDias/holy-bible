import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Crie esta função fora do seu componente (ou em um arquivo api.js separado)
const fetchBookOfJohn = async (translation) => {
  const metaResponse = await fetch(
    `https://bible-api.com/data/${translation}/JHN`,
  );

  if (!metaResponse.ok) {
    throw new Error("Falha ao buscar a lista de capítulos.");
  }

  const metaData = await metaResponse.json();

  // OTIMIZAÇÃO: Promise.all para baixar todos os capítulos ao mesmo tempo!
  const chapterPromises = metaData.chapters.map(async (chapterInfo) => {
    const response = await fetch(chapterInfo.url);

    if (!response.ok) {
      console.warn(`Não foi possível baixar o capítulo ${chapterInfo.chapter}`);
      return []; // Retorna um array vazio para este capítulo se falhar
    }

    const chapterData = await response.json();

    if (chapterData.verses && Array.isArray(chapterData.verses)) {
      return chapterData.verses.map((v) => ({
        id: `${v.chapter}:${v.verse}`,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text,
      }));
    }
    return [];
  });

  // Espera todos os downloads terminarem
  const chaptersResults = await Promise.all(chapterPromises);

  // "chapterResults" é um array de arrays. O ".flat()" junta tudo num array só.
  return chaptersResults.flat();
};

export default function ChapterListScreen() {
  const router = useRouter();
  const flatListRef = useRef(null);

  const [showScrollTop, setShowScrollTop] = useState(false);

  // <-- Novo: Estado para controlar a versão/idioma selecionado
  const [translation, setTranslation] = useState("almeida"); // "almeida" (PT) ou "web" (EN)

  // O TanStack Query substitui seus useState e useEffect!
  const {
    data: versesData = [], // valor padrão como array vazio
    isLoading,
    isError,
    refetch,
    error,
  } = useQuery({
    // A mágica acontece aqui: se 'translation' mudar, ele refaz a busca automaticamente!
    queryKey: ["book", "JHN", translation],
    queryFn: () => fetchBookOfJohn(translation),
  });

  useEffect(() => {
    if (isError) {
      console.error("Erro ao buscar os versículos:", error);

      Alert.alert(
        translation === "almeida" ? "Erro" : "Error",
        translation === "almeida"
          ? "Não foi possível baixar os versículos."
          : "Could not download verses.",
        [
          {
            text: translation === "almeida" ? "Tentar novamente" : "Retry",
            onPress: () => refetch(),
          },
        ],
      );
    }
  }, [isError, error, translation]);

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 300 && !showScrollTop) {
      setShowScrollTop(true);
    } else if (offsetY <= 300 && showScrollTop) {
      setShowScrollTop(false);
    }
  };

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.verseContainer}
      activeOpacity={0.7}
      onPress={() => {
        router.push({
          pathname: "/(tabs)/chapter",
          params: {
            chapter: item.chapter,
            verse: item.verse,
            text: item.text,
            language: translation, // Passando o idioma caso a próxima tela precise
          },
        });
      }}
    >
      <Text style={styles.verseLabel}>
        {item.chapter}:{item.verse}
      </Text>
      <Text style={styles.verseText}>{item.text.trim()}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}>
                {translation === "almeida" ? "João" : "John"}
              </Text>
              <Text style={styles.subTitle}>
                {translation === "almeida"
                  ? "Todos os versículos (Almeida)"
                  : "All verses (OEB-US)"}
              </Text>
            </View>

            {/* <-- Novo: Botões de troca de idioma */}
            <View style={styles.languageToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  translation === "almeida" && styles.toggleButtonActive,
                ]}
                onPress={() => setTranslation("almeida")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    translation === "almeida" && styles.toggleTextActive,
                  ]}
                >
                  PT
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  translation === "oeb-us" && styles.toggleButtonActive,
                ]}
                onPress={() => setTranslation("oeb-us")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    translation === "oeb-us" && styles.toggleTextActive,
                  ]}
                >
                  EN
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>
              {translation === "almeida"
                ? "Baixando capítulos sequencialmente..."
                : "Downloading chapters sequentially..."}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              ref={flatListRef}
              data={versesData}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={10}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.listContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            />

            {showScrollTop && (
              <TouchableOpacity style={styles.fab} onPress={scrollToTop}>
                <Text style={styles.fabIcon}>↑</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    paddingTop: 64,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C6C6C8",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#000000",
  },
  subTitle: {
    fontSize: 15,
    color: "#8E8E93",
    marginTop: -4,
  },
  // <-- Estilos novos para o Toggle de Idioma
  languageToggle: {
    flexDirection: "row",
    backgroundColor: "#E5E5EA",
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8E8E93",
  },
  toggleTextActive: {
    color: "#000000",
    fontWeight: "bold",
  },
  listContent: {
    padding: 16,
  },
  verseContainer: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  verseLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#007AFF",
    width: 45,
    marginTop: 3,
  },
  verseText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: "#1C1C1E",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#8E8E93",
  },
  fab: {
    position: "absolute",
    right: 30,
    bottom: 90,
    backgroundColor: "#007AFF",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabIcon: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: -2,
  },
});
