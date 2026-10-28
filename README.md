# Sukuna Live Studio (MVP local)

Aplicativo local para controlar um avatar 3D estilizado, testar reações, conectar a uma live do TikTok e gerar respostas usando OpenAI, xAI ou modo local.

## O que já está no MVP
- Painel web local com seletor de personagem e cenário.
- Avatar 3D procedural de demonstração com câmera fixa e animações básicas.
- Página de overlay para OBS: `http://127.0.0.1:3000/overlay.html`
- Testes de comentários, rosas, balões e galáxias.
- Backend Node.js com WebSocket para distribuir eventos ao painel e overlay.
- Conector comunitário TikTok Live (pode quebrar quando o TikTok mudar).
- Integração opcional de texto com API OpenAI ou xAI.
- Voz do navegador, Fish Audio por API e Chatterbox Multilingual executado localmente sem chave/API.

## Requisitos
- Windows 10/11
- Node.js 20 ou mais recente
- Internet para carregar Three.js e conectar APIs/TikTok
- OBS Studio para colocar o avatar na live

## Instalação no Windows
1. Instale Node.js LTS: https://nodejs.org/
2. Extraia a pasta do ZIP.
3. Dentro da pasta `SukunaLive`, copie `.env.example` para `.env`.
4. Edite `.env` com a chave de API se for usar OpenAI ou xAI. Não publique nem envie o `.env`.
5. Abra o terminal nessa pasta e execute:

   ```powershell
   npm.cmd install
   npm.cmd start
   ```

6. Abra `http://127.0.0.1:3000`.
7. Use os botões de teste antes de conectar a live.

## Configurar IA
- OpenAI: defina `AI_PROVIDER=openai` e `OPENAI_API_KEY=...`.
- xAI: defina `AI_PROVIDER=xai` e `XAI_API_KEY=...`.
- Sem chave: usa respostas locais de demonstração.
- A assinatura ChatGPT ou Grok não inclui automaticamente uso da API; o faturamento da API é separado.
- O app envia o nome do comentarista e o texto do comentário ao provedor de IA selecionado.

## Colocar no OBS
1. Abra o OBS.
2. Adicione uma fonte **Navegador**.
3. URL: `http://127.0.0.1:3000/overlay.html`
4. Defina a largura/altura da fonte, por exemplo 720 × 1280 para uma live vertical.
5. Se o fundo não ficar transparente na versão do seu navegador/OBS, use chroma key como alternativa provisória.

## TikTok
Digite o usuário sem `@` no painel e clique em Conectar quando a conta estiver ao vivo. Este MVP usa uma biblioteca comunitária não oficial, sem garantia de estabilidade ou suporte do TikTok. Pode exigir ajustes de versão e não é uma integração oficial. Não automatiza comentários enviados de volta ao chat, apenas exibe e fala as respostas no overlay.

## Voz local grátis com Chatterbox (recomendado)
O Chatterbox Multilingual é um modelo aberto sob licença MIT, oferece português e clonagem zero-shot com um áudio de referência. Ele roda no seu computador, sem créditos por requisição. A primeira instalação baixa dependências e pesos do modelo e pode levar bastante tempo; a geração fica limitada à capacidade do PC. Os arquivos gerados contêm marca d'água de áudio do modelo.

1. Instale Python 3.11 (marque **Add Python to PATH** durante a instalação): https://www.python.org/downloads/release/python-3119/
2. Execute `INSTALAR-VOZ-LOCAL.bat` e aguarde terminar.
3. Execute `INICIAR-VOZ-LOCAL.bat` e espere aparecer `[LOCAL TTS] Modelo pronto.`. Mantenha essa janela aberta.
4. No `.env`, deixe `TTS_PROVIDER=chatterbox`.
5. Reinicie o Sukuna (`npm.cmd start`). No painel, escolha **Chatterbox local · grátis**.
6. Para usar uma voz de referência, coloque um arquivo WAV de voz que você tenha direito de usar na pasta do projeto com o nome `voice-reference.wav`. Se não existir, o modelo usa a voz padrão. Recomenda-se um trecho limpo de fala, sem música nem ruído, com consentimento da pessoa gravada.

O serviço de voz local usa `127.0.0.1:8765`; ele não é exposto à rede. Requer internet na primeira instalação para baixar dependências/modelos, mas a geração depois ocorre localmente. Se o PC não tiver CUDA compatível, tentará CPU, que pode ser muito lento.

Links oficiais:
- Código e instruções: https://github.com/resemble-ai/chatterbox
- Modelo multilíngue: https://huggingface.co/ResembleAI/chatterbox

## Voz e personagem
A voz do navegador funciona sem chave de API. A Fish Audio usa a API real no backend: configure `TTS_PROVIDER=fish`, `FISH_AUDIO_API_KEY` e `FISH_AUDIO_VOICE_ID` no arquivo `.env`. O painel e o overlay do OBS usam o provedor selecionado nas configurações. O projeto não clona a voz de Wendell Bezerra ou de outro dublador. Para uso público/comercial, utilize voz licenciada ou uma voz original autorizada.

Os modelos 3D são formas procedurais de demonstração, não modelos oficiais de Sukuna, Goku ou Sonic. Para aparência fiel, importe arquivos GLB/VRM com direitos de uso adequados e configure o rig/animações. O MVP é o esqueleto funcional do produto, não um avatar final de qualidade de jogo.

## Limitações e próximos passos
- Eventos de presentes podem ter nomes localizados e a biblioteca pode entregar campos diferentes; revise os mapeamentos em `server.js`.
- A Fish Audio gera áudio por API e pode consumir créditos. O Chatterbox local não usa API paga. Se a chamada falhar, confira o terminal do servidor, a chave, os créditos e o Voice ID.
- Adicionar fila de fala, interrupção de falas, moderação, lista de usuários ignorados, limite de custo e métricas de eventos.
- A aplicação escuta apenas em `127.0.0.1`, adequada para uso local.


## Ativar a Fish Audio (TTS)
1. Copie `.env.example` para `.env` e preencha `FISH_AUDIO_API_KEY=sua_chave_nova`.
2. Selecione uma voz na Fish Audio e copie o ID/Reference ID da voz para `FISH_AUDIO_VOICE_ID=seu_voice_id`. Algumas vozes públicas/contas podem permitir chamada sem esse campo, mas uma voz específica normalmente precisa do ID.
3. Deixe `FISH_AUDIO_MODEL=s2.1-pro` (ou use o modelo disponível na sua conta).
4. No painel, em **Voz**, selecione **Fish Audio · configurar API** e clique **Salvar configurações**. O servidor também inicia com Fish selecionada quando `TTS_PROVIDER=fish`.
5. Reinicie `npm start` depois de alterar `.env`. Teste enviando um comentário de teste no painel.

A chave fica no backend e não deve ser colocada no HTML/JavaScript do navegador. O backend chama `https://api.fish.audio/v1/tts` e devolve o MP3 ao navegador. A API pode consumir créditos.
