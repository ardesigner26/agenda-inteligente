# Agenda Inteligente

App web gratuito para transformar notas soltas em compromissos organizados por data, com alarmes, som, vibracao, soneca, personalizacao visual e modo instalavel.

## Como usar

1. Abra o app em um navegador moderno.
2. Cole linhas como:

```text
Dentista dia 30/06 as 14h
Reuniao com Ana amanha 9:30
Pagar aluguel 05/07
```

3. Clique em **Organizar**.

Os compromissos ficam salvos no `localStorage` do navegador.

## Instalar no celular ou computador

O app ja esta pronto como PWA.

- Android/Chrome/Edge: abra o link publicado e toque em **Instalar app**.
- iPhone/iPad/Safari: abra o link publicado, toque em Compartilhar e depois em **Adicionar a Tela de Inicio**.
- Computador/Chrome/Edge: abra o link publicado e use **Instalar app**.

Depois de carregado, o app funciona offline. Alarmes com som/vibracao dependem do navegador manter o app aberto ou ativo.

## Publicacao gratuita

Este projeto e 100% estatico: `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js` e `icons/`.

Opcoes gratuitas:

- GitHub Pages
- Netlify
- Cloudflare Pages

Basta publicar esta pasta. O link gerado deve usar HTTPS para permitir instalacao como app e funcionamento completo do service worker.

## Backup

Use **Exportar backup** para gerar um arquivo `.json` com seus compromissos e preferencias. Em outro aparelho, use **Importar backup** para restaurar.

## Sincronizacao compartilhada

O app agora pode sincronizar usando Supabase gratuito. A sincronizacao funciona enquanto o app esta aberto e usa o mesmo **ID da agenda compartilhada** em todos os aparelhos.

### Criar a nuvem gratuita

1. Crie um projeto em Supabase.
2. Abra **SQL Editor**.
3. Cole e execute o conteudo do arquivo `sync-setup.sql`.
4. Em **Project Settings > API**, copie:
   - Project URL
   - anon public key
5. No app, preencha:
   - URL do Supabase
   - Chave publica anon
   - ID da agenda compartilhada, por exemplo `familia`
6. Clique em **Salvar sync**.

Use os mesmos dados no celular/computador da outra pessoa. Tudo que um aparelho adicionar, editar, concluir ou apagar sera mesclado com a agenda compartilhada.

Observacao: essa primeira sincronizacao e por agenda compartilhada. Para login individual, permissoes por pessoa e historico de autoria, o proximo passo e ativar autenticação do Supabase.

## Sobre iCloud Notes

O iCloud Notes nao oferece uma API publica simples para um app web no Windows ler suas notas automaticamente. A rota mais confiavel e manter uma nota/exportacao em texto dentro do iCloud Drive e importar esse arquivo no app.

Formatos reconhecidos nesta primeira versao:

- `dd/mm` e `dd/mm/aaaa`
- `dia 27`, usando o mes atual quando a data ainda nao passou
- `aaaa-mm-dd`
- `hoje`
- `amanha`
- dias da semana, como `segunda`, `terca-feira`, `sexta`
- horarios como `14h`, `14h30`, `09:30`, `as 10`, `19 horas` e `7 da noite`
- lembretes como `15 min antes`, `1 hora antes`, `2 horas antes`, `1 dia antes` e `na hora`

Exemplos com alarme:

```text
Dentista dia 30/06 as 14h 1 hora antes
Reuniao com Ana amanha 9:30 15 min antes
Pagar aluguel 05/07 as 10h 1 dia antes
```

Os alarmes funcionam enquanto a agenda estiver aberta. Para receber notificacoes do navegador, clique em **Ativar notificacoes** no painel lateral.

Quando um alarme dispara, o app mostra uma tela cheia com botao para desligar e opcoes de soneca. Para tocar som, clique antes em **Ativar som**. Em celulares e navegadores compativeis, o app tambem tenta vibrar durante o alerta.

## Personalizacao dos alarmes

No painel **Alarmes**, voce pode escolher o visual da tela cheia:

- `iOS claro`
- `Android escuro`
- `Dourado suave`
- `Minimalista`

Tambem da para escolher a cor de destaque. Essa preferencia fica salva no navegador.
