import Parse from 'parse/node';

Parse.initialize('Vx2gKktpXfVdZgQVgmAig6L45gTKhe8Fo6DyeO2G', 'Qnx659JfuHpWRj1nQdoTxpoKt22vQmZWOGvO4Znc', '2Mb1tpqZhxUlWPP8XQiCmKPObfLfmzSfEk4TGcXc');
Parse.serverURL = 'https://parseapi.back4app.com';

const indicados = [
  {
    tmdbId: 545611,
    ano: 2023,
    categorias: ['Melhor Filme', 'Melhor Diretor', 'Melhor Atriz', 'Melhor Ator Coadjuvante', 'Melhor Atriz Coadjuvante', 'Melhor Roteiro Original', 'Melhor Trilha Sonora', 'Melhor Canção Original', 'Melhor Figurino', 'Melhor Montagem'],
    vencedores: ['Melhor Filme', 'Melhor Diretor', 'Melhor Atriz', 'Melhor Ator Coadjuvante', 'Melhor Atriz Coadjuvante::Jamie Lee Curtis', 'Melhor Roteiro Original', 'Melhor Montagem'],
    atoresIndicados: { 'Melhor Atriz': ['Michelle Yeoh'], 'Melhor Ator Coadjuvante': ['Ke Huy Quan'], 'Melhor Atriz Coadjuvante': ['Jamie Lee Curtis', 'Stephanie Hsu'] },
    titulo: 'Tudo em Todo o Lugar ao Mesmo Tempo',
    cancao: { 'Melhor Canção Original': ['This Is A Life - Ryan Lott, David Byrne, Mitski'] }
  },
  {
    tmdbId: 49046,
    ano: 2023,
    categorias: ['Melhor Filme', 'Melhor Roteiro Adaptado', 'Melhor Filme Internacional', 'Melhor Trilha Sonora', 'Melhor Som', 'Melhor Design de Produção', 'Melhor Fotografia', 'Melhor Maquiagem e Penteados', 'Melhores Efeitos Visuais'],
    vencedores: ['Melhor Filme Internacional', 'Melhor Trilha Sonora', 'Melhor Design de Produção', 'Melhor Fotografia'],
    atoresIndicados: {},
    titulo: 'Nada de Novo no Front',
    cancao: {}
  },
  {
    tmdbId: 674324,
    ano: 2023,
    categorias: ['Melhor Filme', 'Melhor Diretor', 'Melhor Ator', 'Melhor Ator Coadjuvante', 'Melhor Atriz Coadjuvante', 'Melhor Roteiro Original', 'Melhor Trilha Sonora', 'Melhor Montagem'],
    vencedores: [],
    atoresIndicados: { 'Melhor Ator': ['Colin Farrell'], 'Melhor Ator Coadjuvante': ['Brendan Gleeson', 'Barry Keoghan'], 'Melhor Atriz Coadjuvante': ['Kerry Condon'] },
    titulo: 'Os Banshees de Inisherin',
    cancao: {}
  },
  {
    tmdbId: 614934,
    ano: 2023,
    categorias: ['Melhor Filme', 'Melhor Ator', 'Melhor Som', 'Melhor Fotografia', 'Melhor Maquiagem e Penteados', 'Melhor Figurino', 'Melhor Montagem', 'Melhor Design de Produção'],
    vencedores: [],
    atoresIndicados: { 'Melhor Ator': ['Austin Butler'] },
    titulo: 'Elvis',
    cancao: {}
  },
  {
    tmdbId: 804095,
    ano: 2023,
    categorias: ['Melhor Filme', 'Melhor Diretor', 'Melhor Atriz', 'Melhor Ator Coadjuvante', 'Melhor Roteiro Original', 'Melhor Design de Produção'],
    vencedores: [],
    atoresIndicados: { 'Melhor Atriz': ['Michelle Williams'], 'Melhor Ator Coadjuvante': ['Judd Hirsch'] },
    titulo: 'Os Fabelmans',
    cancao: {}
  },
  {
    tmdbId: 817758,
    ano: 2023,
    categorias: ['Melhor Filme', 'Melhor Diretor', 'Melhor Atriz', 'Melhor Roteiro Original', 'Melhor Fotografia', 'Melhor Montagem'],
    vencedores: [],
    atoresIndicados: { 'Melhor Atriz': ['Cate Blanchett'] },
    titulo: 'Tár',
    cancao: {}
  },
  {
    tmdbId: 361743,
    ano: 2023,
    categorias: ['Melhor Filme', 'Melhor Roteiro Adaptado', 'Melhor Canção Original', 'Melhor Som', 'Melhor Montagem', 'Melhores Efeitos Visuais'],
    vencedores: ['Melhor Som'],
    atoresIndicados: {},
    titulo: 'Top Gun: Maverick',
    cancao: { 'Melhor Canção Original': ['Hold My Hand - Lady Gaga, BloodPop'] }
  },
  {
    tmdbId: 505642,
    ano: 2023,
    categorias: ['Melhor Atriz Coadjuvante', 'Melhor Canção Original', 'Melhor Figurino', 'Melhor Maquiagem e Penteados', 'Melhores Efeitos Visuais'],
    vencedores: ['Melhor Figurino'],
    atoresIndicados: { 'Melhor Atriz Coadjuvante': ['Angela Bassett'] },
    titulo: 'Pantera Negra: Wakanda para Sempre',
    cancao: { 'Melhor Canção Original': ['Lift Me Up - Tems, Rihanna, Ryan Coogler, Ludwig Göransson'] }
  },
  {
    tmdbId: 76600,
    ano: 2023,
    categorias: ['Melhor Filme', 'Melhor Som', 'Melhor Design de Produção', 'Melhores Efeitos Visuais'],
    vencedores: ['Melhores Efeitos Visuais'],
    atoresIndicados: {},
    titulo: 'Avatar: O Caminho da Água',
    cancao: {}
  },
  {
    tmdbId: 785084,
    ano: 2023,
    categorias: ['Melhor Ator', 'Melhor Atriz Coadjuvante', 'Melhor Maquiagem e Penteados'],
    vencedores: ['Melhor Ator', 'Melhor Maquiagem e Penteados'],
    atoresIndicados: { 'Melhor Ator': ['Brendan Fraser'], 'Melhor Atriz Coadjuvante': ['Hong Chau'] },
    titulo: 'A Baleia',
    cancao: {}
  },
  {
    tmdbId: 497828,
    ano: 2023,
    categorias: ['Melhor Filme', 'Melhor Diretor', 'Melhor Roteiro Original'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Triângulo da Tristeza',
    cancao: {}
  },
  {
    tmdbId: 777245,
    ano: 2023,
    categorias: ['Melhor Filme', 'Melhor Roteiro Adaptado'],
    vencedores: ['Melhor Roteiro Adaptado'],
    atoresIndicados: {},
    titulo: 'Entre Mulheres',
    cancao: {}
  },
  {
    tmdbId: 615777,
    ano: 2023,
    categorias: ['Melhor Figurino', 'Melhor Trilha Sonora', 'Melhor Design de Produção'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Babilônia',
    cancao: {}
  },
  {
    tmdbId: 414906,
    ano: 2023,
    categorias: ['Melhor Som', 'Melhor Maquiagem e Penteados', 'Melhores Efeitos Visuais'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Batman',
    cancao: {}
  },
  {
    tmdbId: 760099,
    ano: 2023,
    categorias: ['Melhor Ator', 'Melhor Roteiro Adaptado'],
    vencedores: [],
    atoresIndicados: { 'Melhor Ator': ['Bill Nighy'] },
    titulo: 'Viver',
    cancao: {}
  },
  {
    tmdbId: 823147,
    ano: 2023,
    categorias: ['Melhor Atriz'],
    vencedores: [],
    atoresIndicados: { 'Melhor Atriz': ['Andrea Riseborough'] },
    titulo: 'A Sorte Grande',
    cancao: {}
  },
  {
    tmdbId: 301502,
    ano: 2023,
    categorias: ['Melhor Atriz'],
    vencedores: [],
    atoresIndicados: { 'Melhor Atriz': ['Ana de Armas'] },
    titulo: 'Blonde',
    cancao: {}
  },
  {
    tmdbId: 595586,
    ano: 2023,
    categorias: ['Melhor Ator Coadjuvante'],
    vencedores: [],
    atoresIndicados: { 'Melhor Ator Coadjuvante': ['Brian Tyree Henry'] },
    titulo: 'Passagem',
    cancao: {}
  },
  {
    tmdbId: 661374,
    ano: 2023,
    categorias: ['Melhor Roteiro Adaptado'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Glass Onion: Um Mistério Knives Out',
    cancao: {}
  },
  {
    tmdbId: 814757,
    ano: 2023,
    categorias: ['Melhor Fotografia'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Império da Luz',
    cancao: {}
  },
  {
    tmdbId: 754609,
    ano: 2023,
    categorias: ['Melhor Figurino'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Sra. Harris Vai a Paris',
    cancao: {}
  },
  {
    tmdbId: 579974,
    ano: 2023,
    categorias: ['Melhor Canção Original'],
    vencedores: ['Melhor Canção Original'],
    atoresIndicados: {},
    titulo: 'RRR: Revolta, Rebelião, Revolução',
    cancao: { 'Melhor Canção Original': ['Naatu Naatu - M. M. Keeravani, Chandrabose'] }
  },
  {
    tmdbId: 822124,
    ano: 2023,
    categorias: ['Melhor Canção Original'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Elas por Elas',
    cancao: { 'Melhor Canção Original': ['Applause - Diane Warren'] }
  },
  {
    tmdbId: 555604,
    ano: 2023,
    categorias: ['Melhor Animação'],
    vencedores: ['Melhor Animação'],
    atoresIndicados: {},
    titulo: 'Pinóquio por Guillermo del Toro',
    cancao: {}
  },
  {
    tmdbId: 315162,
    ano: 2023,
    categorias: ['Melhor Animação'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Gato de Botas 2: O Último Pedido',
    cancao: {}
  },
  {
    tmdbId: 869626,
    ano: 2023,
    categorias: ['Melhor Animação'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Marcel, a Concha de Sapatos',
    cancao: {}
  },
  {
    tmdbId: 560057,
    ano: 2023,
    categorias: ['Melhor Animação'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'A Fera do Mar',
    cancao: {}
  },
  {
    tmdbId: 508947,
    ano: 2023,
    categorias: ['Melhor Animação'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Red: Crescer é Uma Fera',
    cancao: {}
  },
  {
    tmdbId: 926676,
    ano: 2023,
    categorias: ['Melhor Documentário (Longa)'],
    vencedores: ['Melhor Documentário (Longa)'],
    atoresIndicados: {},
    titulo: 'Navalny',
    cancao: {}
  },
  {
    tmdbId: 913838,
    ano: 2023,
    categorias: ['Melhor Documentário (Longa)'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Tudo o que Respira',
    cancao: {}
  },
  {
    tmdbId: 1004663,
    ano: 2023,
    categorias: ['Melhor Documentário (Longa)'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'All the Beauty and the Bloodshed',
    cancao: {}
  },
  {
    tmdbId: 913823,
    ano: 2023,
    categorias: ['Melhor Documentário (Longa)'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Vulcões: A Tragédia de Katia e Maurice Krafft',
    cancao: {}
  },
  {
    tmdbId: 913743,
    ano: 2023,
    categorias: ['Melhor Documentário (Longa)'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'A House Made of Splinters',
    cancao: {}
  },
  {
    tmdbId: 714888,
    ano: 2023,
    categorias: ['Melhor Filme Internacional'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Argentina 1985',
    cancao: {}
  },
  {
    tmdbId: 901563,
    ano: 2023,
    categorias: ['Melhor Filme Internacional'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Close',
    cancao: {}
  },
  {
    tmdbId: 785398,
    ano: 2023,
    categorias: ['Melhor Filme Internacional'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'EO',
    cancao: {}
  },
  {
    tmdbId: 916405,
    ano: 2023,
    categorias: ['Melhor Filme Internacional'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'A Menina Silenciosa',
    cancao: {}
  },
  {
    tmdbId: 889598,
    ano: 2023,
    categorias: ['Melhor Curta-Metragem (Live Action)'],
    vencedores: ['Melhor Curta-Metragem (Live Action)'],
    atoresIndicados: {},
    titulo: 'An Irish Goodbye',
    cancao: {}
  },
  {
    tmdbId: 1042171,
    ano: 2023,
    categorias: ['Melhor Curta-Metragem (Live Action)'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Ivalu',
    cancao: {}
  },
  {
    tmdbId: 974586,
    ano: 2023,
    categorias: ['Melhor Curta-Metragem (Live Action)'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Le Pupille',
    cancao: {}
  },
  {
    tmdbId: 715714,
    ano: 2023,
    categorias: ['Melhor Curta-Metragem (Live Action)'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Night Ride',
    cancao: {}
  },
  {
    tmdbId: 1032734,
    ano: 2023,
    categorias: ['Melhor Curta-Metragem (Live Action)'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'The Red Suitcase',
    cancao: {}
  },
  {
    tmdbId: 995133,
    ano: 2023,
    categorias: ['Melhor Curta de Animação'],
    vencedores: ['Melhor Curta de Animação'],
    atoresIndicados: {},
    titulo: 'O Menino, a Toupeira, a Raposa e o Cavalo',
    cancao: {}
  },
  {
    tmdbId: 742872,
    ano: 2023,
    categorias: ['Melhor Curta de Animação'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'The Flying Sailor',
    cancao: {}
  },
  {
    tmdbId: 965171,
    ano: 2023,
    categorias: ['Melhor Curta de Animação'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Ice Merchants',
    cancao: {}
  },
  {
    tmdbId: 971188,
    ano: 2023,
    categorias: ['Melhor Curta de Animação'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'My Year of Dicks',
    cancao: {}
  },
  {
    tmdbId: 943776,
    ano: 2023,
    categorias: ['Melhor Curta de Animação'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'An Ostrich Told Me the World Is Fake and I Think I Believe It',
    cancao: {}
  },
  {
    tmdbId: 1041580,
    ano: 2023,
    categorias: ['Melhor Documentário (Curta)'],
    vencedores: ['Melhor Documentário (Curta)'],
    atoresIndicados: {},
    titulo: 'Como Cuidar de um Bebê Elefante',
    cancao: {}
  },
  {
    tmdbId: 926993,
    ano: 2023,
    categorias: ['Melhor Documentário (Curta)'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Haulout',
    cancao: {}
  },
  {
    tmdbId: 846854,
    ano: 2023,
    categorias: ['Melhor Documentário (Curta)'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Como Se Mede Um Ano?',
    cancao: {}
  },
  {
    tmdbId: 914268,
    ano: 2023,
    categorias: ['Melhor Documentário (Curta)'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'O Efeito Martha Mitchell',
    cancao: {}
  },
  {
    tmdbId: 964789,
    ano: 2023,
    categorias: ['Melhor Documentário (Curta)'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Stranger at the Gate',
    cancao: {}
  },
  {
    tmdbId: 965150,
    ano: 2023,
    categorias: ['Melhor Ator'],
    vencedores: [],
    atoresIndicados: { 'Melhor Ator': ['Paul Mescal'] },
    titulo: 'Aftersun',
    cancao: {}
  },
  {
    tmdbId: 685691,
    ano: 2023,
    categorias: ['Melhor Fotografia'],
    vencedores: [],
    atoresIndicados: {},
    titulo: 'Bardo, Falsa Crónica de Algumas Verdades',
    cancao: {}
  }
];
 /*
async function inserir() {
  for (const dado of indicados) {
    const Filme = Parse.Object.extend('Filme');
    const filme = new Filme();
    filme.set('tmdbId', dado.tmdbId);
    filme.set('titulo', dado.titulo);
    filme.set('diretor', dado.diretor);
    filme.set('ano', dado.ano);
    filme.set('categorias', dado.categorias);
    filme.set('vencedores', dado.vencedores);
    filme.set('atoresIndicados', dado.atoresIndicados);
    filme.set('cancao', dado.cancao);
    await filme.save();
    console.log(`✓ Inserido: ${dado.titulo} (${dado.ano})`);
  }
  console.log('Concluído!');
}

inserir().catch(console.error);
*/