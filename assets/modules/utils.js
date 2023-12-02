const fs = require("fs");
const { exec } = require('child_process');

function saveIgnoredUsers(msg, bot) {
  const chatId = msg.chat.id;
  const usersData = JSON.parse(fs.readFileSync("./assets/data/users.json"));
  const text = msg.text;

  const entries = text.split(',').map(entry => entry.trim());
  const userIds = [];
  const usernames = [];

  entries.forEach(entry => {
    if (!isNaN(entry)) {
      userIds.push(Number(entry));
    } else {
      usernames.push(entry); 
    }
  });

  userIds.forEach(userId => {
    const user = usersData.find(u => u.id === userId);

    if (user) {
      user.heAcceptedAgreement = true;
    }

    const statusMessage = user ? `Пользователь ${userId} найден, значение установлено` : `Пользователь ${userId}, не найден`;
    bot.sendMessage(chatId, statusMessage);
  });

  usernames.forEach(username => {
    const user = usersData.find(u => u.nick === username);

    if (user) {
      user.heAcceptedAgreement = true;
    }

    const statusMessage = user ? `Пользователь ${username} найден, значение установлено` : `Пользователь ${username}, не найден`;
    bot.sendMessage(chatId, statusMessage);
  });

  fs.writeFileSync(
    "./assets/data/users.json",
    JSON.stringify(usersData, null, "\t")
  );
}

function saveNewGroupText(msg, bot) {
  const chatId = msg.chat.id;
  const groupsData = JSON.parse(fs.readFileSync("./assets/data/groups.json"));
  const messageText = msg.text;

  if (messageText.includes(',')) {
    const [groupId, text] = messageText.split(',').map(part => part.trim());
    const formattedText = text.replace(/(\r\n|\r|\n)/g, '\n');

    groupsData.push({id: groupId, text: formattedText})

    fs.writeFileSync(
      "./assets/data/groups.json",
      JSON.stringify(groupsData, null, "\t")
    );

    bot.sendMessage(chatId, `Сообщение для группы ${groupId} успешно установлено`);
  } else {
    bot.sendMessage(chatId, "Сообщение должно содержать запятую. Пример: groupId, текст");
  }
}


function stopBot() {
  console.log('Stopping the bot...');
  
  exec('pm2 stop 0', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error stopping the bot: ${error}`);
      return;
    }

    console.log('Bot stopped successfully.', stdout);
  });
}


module.exports = {
  saveIgnoredUsers,
  saveNewGroupText,
  stopBot
};
