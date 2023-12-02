require("dotenv").config({ path: "./assets/.env" });
const TelegramBotApi = require("node-telegram-bot-api");
const bot = new TelegramBotApi(process.env.TOKEN, { polling: true });
const fs = require("fs");

const users = require("./assets/data/users.json");
const {
  saveIgnoredUsers,
  saveNewGroupText,
} = require("./assets/modules/utils");
const commands = JSON.parse(fs.readFileSync("./assets/data/commands.json"));

bot.setMyCommands(commands);

const handleAddIgnoredUsersMessageSend = (msg) => {
  saveIgnoredUsers(msg, bot);
  bot.removeListener("message", handleAddIgnoredUsersMessageSend);
};

const handleAddGroupTextMessageSend = (msg) => {
  saveNewGroupText(msg, bot);
  bot.removeListener("message", handleAddGroupTextMessageSend);
};


bot.on("message", (msg) => {
  const command = msg.text;
  const chatId = msg.chat.id;
  const { type } = msg.chat;
  const { message_id } = msg;

  
  var user = users.filter((x) => x.id === msg.from.id)[0];

  if (!user) {
    users.push({
      id: msg.from.id,
      nick: msg.from.username,
      name: msg.from.first_name,
      heAcceptedAgreement: false,
    });

    user = users.filter((x) => x.id === msg.from.id)[0];
    fs.writeFileSync(
      "./assets/data/users.json",
      JSON.stringify(users, null, "\t")
    );
  }

  console.log(user)

  switch (command) {
    case "/addigonredusers":
      if (user?.id === Number(process.env.ADMIN_CHAT_ID)) {
        const addIgonredUsersText = `Отправьте список chatId пользователей или username пользователей которых вы хотите добавить в игнор\n\nПример: 1454688178, Vladimir003, 1454688178`;
        bot.sendMessage(chatId, addIgonredUsersText);
        bot.on("message", handleAddIgnoredUsersMessageSend);
      } else {
        bot.sendMessage(chatId, "Вы не админ");
      }

      break;

    case "/addgrouptext":
      if (user?.id === Number(process.env.ADMIN_CHAT_ID)) {
        const addGroupTextMessage = `Отправьте мне groupId (его можно получить из группы, предварительно добавив туда бота @GetMyChatID_Bot), и текст в обычном формате.\n\nПример:\ngroupid, текст\nтекст`;
        bot.sendMessage(chatId, addGroupTextMessage);
        bot.on("message", handleAddGroupTextMessageSend);
      } else {
        bot.sendMessage(chatId, "Вы не админ");
      }

      break;

    default:
      if (type === "group" || type === "supergroup") {
        if (user.id !== Number(process.env.ADMIN_CHAT_ID) && user.nick !== "GroupAnonymousBot") {
          if (!user.heAcceptedAgreement) {
            const groups = JSON.parse(
              fs.readFileSync("./assets/data/groups.json")
            );

            const group = groups?.find((g) => Number(g.id) === chatId);

            if (group) {
              bot.deleteMessage(chatId, message_id);
              bot
                .sendMessage(chatId, group?.text, {
                  reply_markup: JSON.stringify({
                    inline_keyboard: [
                      [{ text: "Не коммерческое", callback_data: `nonProfit` }],
                      [
                        {
                          text: "Админ",
                          callback_data: `admin`,
                          url: process.env.ADMIN_URL,
                        },
                      ],
                    ],
                  }),
                })
                .then(({ message_id }) => {
                  setTimeout(() => {
                    bot.deleteMessage(chatId, message_id);
                  }, 120000);
                });
            } else {
              const textForUser = `Здравствуйте @${user?.nick}, если у Вас не коммерческое объявление нажмите кнопку «Не коммерческое» и опубликуйте повторно.\n\nЕсли у Вас коммерческое объявление нажмите кнопку Админ\n\n❗️❗️❗️Если Вы опубликуете коммерческое объявление не согласовав с Администратором группы, получите вечный БАН`;
              bot.deleteMessage(chatId, message_id);
              bot
                .sendMessage(chatId, textForUser, {
                  reply_markup: JSON.stringify({
                    inline_keyboard: [
                      [{ text: "Не коммерческое", callback_data: `nonProfit` }],
                      [
                        {
                          text: "Админ",
                          callback_data: `admin`,
                          url: process.env.ADMIN_URL,
                        },
                      ],
                    ],
                  }),
                })
                .then(({ message_id }) => {
                  setTimeout(() => {
                    bot.deleteMessage(chatId, message_id);
                  }, 120000);
                });
            }
          }
        }
      }

      break;
  }
});

bot.on("callback_query", (msg) => {
  const chatId = msg.from.id;
  const channelChatId = msg.message.chat.id;
  const query = msg.data;
  const user = users.filter((x) => x.id === chatId)[0];

  switch (query) {
    case "nonProfit":
      const nonProfitText = `@${user?.nick}, Теперь у вас есть доступ к отправке сообщений\n\n❗️❗️❗️Если Вы опубликуете коммерческое объявление не согласовав с Администратором группы, получите вечный БАН`;

      bot.sendMessage(channelChatId, nonProfitText).then(({ message_id }) => {
        setTimeout(() => {
          bot.deleteMessage(channelChatId, message_id);
        }, 120000);
      });

      user.heAcceptedAgreement = true;
      fs.writeFileSync(
        "./assets/data/users.json",
        JSON.stringify(users, null, "\t")
      );

      break;

    default:
      break;
  }
});

bot.on("polling_error", console.log);
