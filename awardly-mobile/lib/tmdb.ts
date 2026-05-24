// lib/tmdb.ts
// Praticamente idêntico ao original. Duas mudanças:
// 1. NEXT_PUBLIC_ → EXPO_PUBLIC_
// 2. getImageURL: fallback local em vez de '/placeholder.jpg'

const BASE_URL = process.env.EXPO_PUBLIC_TMDB_BASE_URL;
const API_KEY  = process.env.EXPO_PUBLIC_TMDB_API_KEY;

async function fetchTMDB(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', API_KEY!);
  url.searchParams.set('language', 'pt-BR');

  Object.entries(params).forEach(([key, val]) => {
    url.searchParams.set(key, val);
  });

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Erro TMDB: ${res.status}`);
  return res.json();
}

export const getFilme          = (id: string | number) => fetchTMDB(`/movie/${id}`);
export const getFilmeCreditos  = (id: string | number) => fetchTMDB(`/movie/${id}/credits`);
export const getFilmeImagens   = (id: string | number) => fetchTMDB(`/movie/${id}/images`, {
  include_image_language: 'en,null',
});
export const getPessoaCreditos = (id: string | number) => fetchTMDB(`/person/${id}/movie_credits`);

export const getPessoa = async (id: string | number) => {
  const ptBR = await fetchTMDB(`/person/${id}`);
  if (ptBR.biography) return ptBR;
  // Fallback para inglês se não houver biografia em pt-BR
  const en = await fetchTMDB(`/person/${id}`, { language: 'en-US' });
  return { ...ptBR, biography: en.biography };
};

// Tamanhos úteis: w185, w342, w500, w780, original
// No RN não existe '/placeholder.jpg' — usamos require() local
export const getImageURL = (path: string | null | undefined, tamanho = 'w500'): string | null => {
  if (!path) return null; // componentes tratam null mostrando placeholder local
  return `${process.env.EXPO_PUBLIC_TMDB_IMAGE_BASE}/${tamanho}${path}`;
};

// No .env:
//   EXPO_PUBLIC_TMDB_BASE_URL=https://api.themoviedb.org/3
//   EXPO_PUBLIC_TMDB_API_KEY=sua_chave
//   EXPO_PUBLIC_TMDB_IMAGE_BASE=https://image.tmdb.org/t/p