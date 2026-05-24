// hooks/useFilmes.ts
// Lógica idêntica ao original. Sem nenhuma dependência de browser/Next.js —
// só muda o caminho dos imports.

import { useState, useEffect } from 'react';
import Parse from '../lib/parseClient';
import { getFilme, getFilmeCreditos, getImageURL } from '../lib/tmdb';

export interface Filme {
  id:              string;
  tmdbId:          string | number;
  tituloOriginal:  string;
  sinopse:         string;
  poster:          string | null;
  backdrop:        string | null;
  anoLancamento:   string;
  nota:            string;
  duracao:         number;
  categorias:      string[];
  vencedores:      string[];
  atoresIndicados: Record<string, string | string[]>;
  cancao:          Record<string, string | string[]>;
  diretor:         string | null;
  roteiristas:     string | null;
  titulo:          string;
}

export function useFilmes(ano: number | null = null) {
  const [filmes,  setFilmes]  = useState<Filme[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro,    setErro]    = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        setErro(null);

        const FilmeClass = Parse.Object.extend('Filme');
        const query = new Parse.Query(FilmeClass);
        if (ano) query.equalTo('ano', ano);
        query.limit(1000);
        const filmesDB = await query.find();

        const resultados = await Promise.allSettled(
          filmesDB.map(async (filme: any) => {
            const tmdbId = filme.get('tmdbId');

            const [detalhes, creditos] = await Promise.all([
              getFilme(tmdbId),
              getFilmeCreditos(tmdbId),
            ]);

            const diretoresTMDB =
              creditos.crew
                ?.filter((p: any) => p.job === 'Director')
                .map((p: any) => p.name)
                .join(', ') || null;

            const JOBS_ROTEIRISTA = ['Screenplay', 'Story', 'Writer', 'Original Story'];

            const roteiristas =
              creditos.crew
                ?.filter((p: any) => JOBS_ROTEIRISTA.includes(p.job))
                .map((p: any) => p.name)
                .filter((nome: string, i: number, arr: string[]) => arr.indexOf(nome) === i)
                .join(', ') || null;

            return {
              id:              filme.id,
              tmdbId,
              tituloOriginal:  detalhes.original_title,
              sinopse:         detalhes.overview,
              poster:          getImageURL(detalhes.poster_path, 'w342'),
              backdrop:        getImageURL(detalhes.backdrop_path, 'w780'),
              anoLancamento:   detalhes.release_date?.split('-')[0],
              nota:            detalhes.vote_average?.toFixed(1),
              duracao:         detalhes.runtime,
              categorias:      filme.get('categorias')      || [],
              vencedores:      filme.get('vencedores')      || [],
              atoresIndicados: filme.get('atoresIndicados') || {},
              cancao:          filme.get('cancao')          || {},
              diretor:         diretoresTMDB,
              roteiristas,
              titulo:          filme.get('titulo')          || detalhes.title,
            } as Filme;
          })
        );

        const filmesCompletos = resultados
          .filter((r): r is PromiseFulfilledResult<Filme> => r.status === 'fulfilled')
          .map((r) => r.value);

        setFilmes(filmesCompletos);
      } catch (e: any) {
        setErro(e.message);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [ano]);

  return { filmes, loading, erro };
}