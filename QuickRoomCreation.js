const puppeteer = require('puppeteer');

(async () => {
  const playerNames = ['Kong', 'Kang', 'Kung']; // Jogadores que entrarão depois de "King"
  const kingName = 'King';
  const roomName = 'Party';
  const baseUrl = 'http://localhost:5173/';

  // Inicia o navegador
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
  });

  // Abre a aba para o "King" e cria a sala
  const kingPage = await browser.newPage();

  const [width, height] = await kingPage.evaluate(() => [window.innerWidth, window.innerHeight]);
  await kingPage.setViewport({ width, height });

  await kingPage.goto(baseUrl);

  // Preenche o nome do jogador "King" e clica em "Start Party"
  await kingPage.type('input[type="text"]', kingName);
  await kingPage.click('button[type="submit"]');

  // Aguarda redirecionamento para a página de salas
  await kingPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });

  // Interage com o botão "Create a Room" e abre o modal
  const createRoomButton = await kingPage.$('button[id="createRoom"]');  // Seleciona o botão de criação da sala
  if (createRoomButton) {
    await createRoomButton.click();  // Clica para abrir o modal
  } else {
    console.log('Botão "Create a Room" não encontrado.');
    return;
  }

  // Aguarda o modal aparecer e insere o nome da sala
  const modalInput = await kingPage.$('input[type="text"]');  // O campo de entrada do nome da sala no modal
  if (modalInput) {
    await modalInput.type(roomName);  // Digita o nome da sala
  } else {
    console.log('Campo de entrada do nome da sala não encontrado.');
    return;
  }

  // Aguarda que o botão de submit do modal esteja visível e clica
  const submitButton = await kingPage.$('button[id="submit"]'); // Botão de submissão do modal
  if (submitButton) {
    await submitButton.click();  // Submete o nome da sala
  } else {
    console.log('Botão de submissão não encontrado.');
    return;
  }

  // Aguarda a sala ser criada na lista de salas e verifica o URL
  const currentUrl = kingPage.url();
  if (currentUrl !== `http://localhost:5173/room/Party`) {
    console.log(`Esperado URL da sala: http://localhost:5173/room/${roomName}, mas foi: ${currentUrl}`);
    return;
  }

  console.log(`Sala "${roomName}" criada por ${kingName}.`);

  // Função para adicionar um jogador na sala, um por vez
  for (const name of playerNames) {
    const playerPage = await browser.newPage();
    const [width, height] = await playerPage.evaluate(() => [window.innerWidth, window.innerHeight]);
    await playerPage.setViewport({ width, height });
    await playerPage.goto(baseUrl);

    // Preenche o nome do jogador e clica em "Start Party"
    await playerPage.type('input[type="text"]', name);
    await playerPage.click('button[type="submit"]');

    // Aguarda redirecionamento para a página de salas
    await playerPage.waitForNavigation({ waitUntil: 'networkidle2' });

    // Espera a lista de salas carregar completamente
    await playerPage.waitForSelector('ul'); // Espera que a lista de salas (ul) esteja carregada

    // Usando $$eval para procurar o li que contém o nome da sala
    const roomFound = await playerPage.$$eval('li', (lis, roomName) => {
      // Procuramos o li que tem um h2 com o nome da sala
      return lis.some(li => {
        const h2 = li.querySelector('h2');
        if (h2) {
          console.log("Verificando h2:", h2.textContent);
        }
        return h2 && h2.textContent.trim() === roomName; // Verifica se o nome da sala está exatamente igual
      });
    }, roomName);

    // Função para escapar caracteres especiais que podem estar no nome da sala
    function escapeCSSIdentifier(ident) {
      return ident.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
    }

    if (roomFound) {
      console.log('Sala encontrada');

      // Usar o seletor de ID para localizar o botão diretamente pelo nome da sala
      const joinButtonSelector = `#${escapeCSSIdentifier(roomName)}`; // Escapando qualquer caractere inválido no nome da sala para um ID CSS válido

      try {
        // Espera o botão com o ID específico estar visível e clicável
        await playerPage.waitForSelector(joinButtonSelector, { visible: true, timeout: 5000 });

        // Scroll até o botão e clique nele
        await playerPage.evaluate((selector) => {
          const button = document.querySelector(selector);
          if (button) {
            button.scrollIntoView();
            button.click();
          }
        }, joinButtonSelector);

        console.log(`${name} entrou na sala "${roomName}".`);
      } catch (error) {
        console.log('Botão "Join" não encontrado ou não pôde ser clicado.', error);
      }
    } else {
      console.log('Sala não encontrada.');
    }

    // Aguardar um tempo antes de continuar para o próximo jogador
    await new Promise((resolve) => setTimeout(resolve, 800)); // Ajuste o tempo conforme necessário
  }

  console.log('Todos os jogadores entraram na sala.');

  // O navegador não será fechado automaticamente
  console.log("Navegador permanecerá aberto.");
  // await browser.close();  // Linha removida para que o navegador não seja fechado
})();