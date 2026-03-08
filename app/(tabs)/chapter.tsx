import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

// 1. Separamos a função de fetch para fora do componente
const fetchChapterVerses = async (chapter, translation) => {
  const response = await fetch(
    `https://bible-api.com/john+${chapter}?translation=${translation}`,
  );

  if (!response.ok) {
    throw new Error("Falha ao buscar os versículos");
  }

  const data = await response.json();

  console.log("Dados recebidos da API:", data); // Log para verificar a estrutura dos dados

  return data.verses.map((v) => ({
    verse: v.verse,
    text: v.text,
  }));
};

export default function ChapterScreen() {
  // 2. Pegamos tanto o capítulo quanto a tradução dos parâmetros
  const { chapter, language } = useLocalSearchParams();

  console.log("Parâmetros recebidos:", { chapter, language });

  // Fallbacks: se não vier ID, carregamos João 1 na versão Almeida
  const currentChapter = chapter ?? "1";
  const currentTranslation = language ?? "almeida";

  // 3. TanStack Query gerencia o estado por nós

  const {
    data: versesData = [],
    isLoading,
    refetch,
    isError,
    error,
  } = useQuery({
    // A queryKey garante que se o capítulo ou a tradução mudarem, o refetch acontece automaticamente!
    queryKey: ["chapter", "JHN", currentChapter, currentTranslation],
    queryFn: () => fetchChapterVerses(currentChapter, currentTranslation),
  });

  useEffect(() => {
    if (isError) {
      console.error("Erro ao buscar os versículos:", error);

      Alert.alert(
        currentTranslation === "almeida" ? "Erro" : "Error",
        currentTranslation === "almeida"
          ? "Não foi possível baixar os versículos."
          : "Could not download verses.",
        [
          {
            text:
              currentTranslation === "almeida" ? "Tentar novamente" : "Retry",
            onPress: () => refetch(),
          },
        ], // <-- Adicione o fechamento do array aqui
      );
    }
  }, [isError, error, currentTranslation]);

  // Função que renderiza cada versículo individualmente
  const renderVerse = ({ item }) => (
    <View style={styles.verseRow}>
      <Text style={styles.verseNumber}>{item.verse}</Text>
      <Text style={styles.verseText}>{item.text.trim()}</Text>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {currentTranslation === "almeida" ? "João" : "John"}{" "}
            {currentChapter}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>
              {currentTranslation === "almeida"
                ? "Carregando versículos..."
                : "Loading verses..."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={versesData}
            keyExtractor={(item) => String(item.verse)}
            renderItem={renderVerse}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 64,
  },
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  verseRow: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  verseNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#8E8E93",
    marginRight: 8,
    marginTop: 3,
    width: 20,
    textAlign: "right",
  },
  verseText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 26,
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
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
});
