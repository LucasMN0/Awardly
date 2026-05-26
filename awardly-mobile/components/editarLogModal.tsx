import { useEffect, useState } from 'react';
import Parse from '../lib/parseClient';
import LogCategoriaModal from './LogCategoriaModal';

interface LogCategoriaItem {
  objectId: string;
  categoria: string;
  ano: number;
  vencedorReal: string | null;
  deveriaTerGanhado: string | null;
  queriaQueGanhasse: string | null;
  review: string | null;
  filmes: any[];
  fotoVencedor: string | null;
  fotoDeveria: string | null;
  fotoQueria: string | null;
  tmdbIdFilme?: string | number;
}

interface Props {
  log: LogCategoriaItem | null; 
  onClose: (resultado?: string) => void;
}

export default function EditarLogModal({ log, onClose }: Props) {
  const [filmes, setFilmes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!log) {
      setFilmes([]);
      return;
    }
    buscarFilmes(log.categoria, log.ano);
  }, [log?.objectId, log?.categoria, log?.ano]);

  async function buscarFilmes(categoria: string, ano: number) {
    setCarregando(true);
    try {
      const q = new Parse.Query('FilmeOscar');
      q.equalTo('ano', ano);
      q.equalTo('categorias', categoria);
      q.limit(20);
      const results = await q.find();
      setFilmes(
        results.map((f: any) => ({
          titulo: f.get('titulo'),
          tmdbId: f.get('tmdbId'),
          poster: f.get('poster') || null,
          atoresIndicados: f.get('atoresIndicados') || {},
          diretor: f.get('diretor') || null,
          roteiristas: f.get('roteiristas') || [],
          cancao: f.get('cancao') || {},
          vencedores: f.get('vencedores') || [],
        }))
      );
    } catch (e) {
      console.error('EditarLogModal: erro ao buscar filmes', e);
      setFilmes([]);
    } finally {
      setCarregando(false);
    }
  }

  if (!log) return null;

  return (
    <LogCategoriaModal
      visivel={!carregando} 
      categoria={log.categoria}
      ano={log.ano}
      filmes={filmes}
      onClose={onClose}
    />
  );
}