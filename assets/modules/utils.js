const fs = require("fs");

function saveIgnoredUsers(msg, bot) {
  const chatId = msg.chat.id;
  const usersData = JSON.parse(fs.readFileSync("./assets/data/users.json"));
  const text = msg.text;

  const userIds = text.split(',').map(id => Number(id.trim())); 
  console.log(userIds)

  userIds.forEach(userId => {
    const user = usersData.find(u => u.id === userId);

    if (user) {
      user.heAcceptedAgreement = true; 
    }

    const statusMessage = user ? `Пользователь ${userId} найден, значение установлено` : `Пользователь ${userId}, не найден`;
    bot.sendMessage(chatId, statusMessage);
  });

  fs.writeFileSync(
    "./assets/data/users.json",
    JSON.stringify(usersData, null, "\t")
  );
}

module.exports = {
  saveIgnoredUsers
};
