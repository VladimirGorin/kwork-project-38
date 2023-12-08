require("dotenv").config({ path: "./assets/.env" });
const TelegramBotApi = require("node-telegram-bot-api");
const bot = new TelegramBotApi(process.env.TOKEN, { polling: true });
const fs = require("fs");

const users = require("./assets/data/users.json");

const {
  saveIgnoredUsers,
  saveNewGroupText,
  saveReceipt,
  saveGroups,
  stopBot,
  saveNewButtons,
} = require("./assets/modules/utils");
const commands = JSON.parse(fs.readFileSync("./assets/data/commands.json"));

bot.setMyCommands(commands);

const handleAddGroups = (msg) => {
  saveGroups(msg, bot);
  bot.removeListener("message", handleAddGroups);
};

const handleSendReceipt = (msg) => {
  saveReceipt(msg, bot);
  bot.removeListener("message", handleSendReceipt);
};

const handleAddIgnoredUsers = (msg) => {
  saveIgnoredUsers(msg, bot);
  bot.removeListener("message", handleAddIgnoredUsers);
};

const handleAddText = (msg) => {
  saveNewGroupText(msg, bot);
  bot.removeListener("message", handleAddText);
};

const handleChangeButtons = (msg) => {
  saveNewButtons(msg, bot);
  bot.removeListener("message", handleChangeButtons);
};

function checkPaymentStatus(query) {
  if (query.includes("cancelPaymentId:")) {
    const paymentId = query.split(":")[1];

    const userWithPaymentId = users.find((x) => x.id === Number(paymentId));

    if (userWithPaymentId) {
      userWithPaymentId.haveSub = false;
      userWithPaymentId.subDays = null;

      fs.writeFileSync(
        "./assets/data/users.json",
        JSON.stringify(users, null, "\t")
      );

      bot.sendMessage(userWithPaymentId.id, `Подписка отклонена!`);

      bot.sendMessage(
        process.env.ADMIN_CHAT_ID,
        `Вы успешно отклонили оплату для ${userWithPaymentId.name}!\nПользователю был отправлен ответ`
      );
    }
  } else if (query.includes("confirmPaymentId:")) {
    const paymentId = query.split(":")[1];

    const userWithPaymentId = users.find((x) => x.id === Number(paymentId));

    if (userWithPaymentId) {
      userWithPaymentId.haveSub = true;
      userWithPaymentId.subDays = 30;

      fs.writeFileSync(
        "./assets/data/users.json",
        JSON.stringify(users, null, "\t")
      );

      bot.sendMessage(
        userWithPaymentId.id,
        `Подписка проверена и оплачена! Срок действия 30 дней.`
      );

      bot.sendMessage(
        process.env.ADMIN_CHAT_ID,
        `Вы успешно приняли оплату для ${userWithPaymentId.name}!\nПользователю была направлена инструкция`
      );
    }
  }
}

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
      groups: [],
      haveSub: false,
      subDays: null,
    });

    user = users.filter((x) => x.id === msg.from.id)[0];
    fs.writeFileSync(
      "./assets/data/users.json",
      JSON.stringify(users, null, "\t")
    );
  }

  switch (command) {
    case "/start":
      if (user?.haveSub) {
        bot.sendMessage(chatId, "Вы подписаны", {
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [{ text: "Добавить группы", callback_data: `addGroups` }],
              [
                {
                  text: "Добавить людей в игнор",
                  callback_data: `addUsersToIgnore`,
                },
              ],
              [
                {
                  text: "Добавить текст для группы",
                  callback_data: `addTextToGroup`,
                },
              ],
              [
                {
                  text: "Изминения кнопок",
                  callback_data: `changeButtons`,
                },
              ],
              [
                {
                  text: "Связь с разработчиком",
                  callback_data: `contactWithCreator`,
                },
              ],
              [{ text: "База знаний", callback_data: `baseInfo` }],
            ],
          }),
        });
      } else {
        bot.sendMessage(chatId, "Вы не подписаны", {
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [{ text: "База знаний", callback_data: `baseInfo` }],
              [
                {
                  text: "Тестовый режим (3) дня",
                  callback_data: `testSubMode`,
                },
              ],
              [{ text: "Купить доступ", callback_data: `buySub` }],
            ],
          }),
        });
      }

      break;

    case "/stop":
      if (user?.id === Number(process.env.ADMIN_CHAT_ID)) {
        stopBot();
      } else {
        bot.sendMessage(chatId, "Вы не админ");
      }

      break;

    default:
      if (type === "supergroup") {
        const superGroupName = msg.chat?.username;
        const availableGroups = JSON.parse(
          fs.readFileSync("./assets/data/users.json")
        );

        const foundUser = availableGroups.find((user) =>
          user?.groups?.some((group) => superGroupName === group?.groupName)
        );

        if (foundUser) {
          if (foundUser.haveSub) {
            if (user.nick !== "s") {
              // if(user.nick !== foundUser.nick){
              if (!user.heAcceptedAgreement) {
                const foundGroup = foundUser?.groups?.find(
                  (group) => group?.groupName === superGroupName
                );
                const defaultFirstText = `${
                  "@" + user?.nick || user?.name
                }, если у Вас не коммерческое объявление нажмите кнопку «Не коммерческое» и опубликуйте повторно.\n\nЕсли у Вас коммерческое объявление нажмите кнопку Админ\n\n❗️❗️❗️Если Вы опубликуете коммерческое объявление не согласовав с Администратором группы, получите вечный БАН`;
                const firstGroupText =
                  `${"@" + user?.nick || user?.name} ` + foundGroup?.firstText ||
                  defaultFirstText;

                const groupAdminButtonURL = foundGroup?.buttons?.[1]?.url;
                const groupAdminButtonText = foundGroup?.buttons?.[1]?.text;

                const groupNoProfitButtonText = foundGroup?.buttons?.[0]?.text;

                const checkIgnoredUsers = foundGroup?.ignoredUsers?.find(
                  (ignoredUser) => ignoredUser === user?.nick
                );

                if (!checkIgnoredUsers) {
                  bot.deleteMessage(chatId, message_id);
                  bot
                    .sendMessage(chatId, firstGroupText, {
                      reply_markup: JSON.stringify({
                        inline_keyboard: [
                          [
                            {
                              text:
                                groupNoProfitButtonText || "Не коммерческое",
                              callback_data: `nonProfit`,
                            },
                          ],
                          [
                            {
                              text: groupAdminButtonText || "Админ",
                              callback_data: `admin`,
                              url: groupAdminButtonURL || process.env.ADMIN_URL,
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
      user.heAcceptedAgreement = true;
      fs.writeFileSync(
        "./assets/data/users.json",
        JSON.stringify(users, null, "\t")
      );

      const nonProfitText = `@${user?.nick}, Теперь у вас есть доступ к отправке сообщений\n\n❗️❗️❗️Если Вы опубликуете коммерческое объявление не согласовав с Администратором группы, получите вечный БАН`;

      bot.sendMessage(channelChatId, nonProfitText).then(({ message_id }) => {
        setTimeout(() => {
          bot.deleteMessage(channelChatId, message_id);
        }, 120000);
      });
      break;

    case "baseInfo":
      const baseInfoText = `@${user?.nick}, База знаний`;
      bot.sendMessage(chatId, baseInfoText);
      break;

    case "testSubMode":
      user.haveSub = true;
      user.subDays = 3;

      fs.writeFileSync(
        "./assets/data/users.json",
        JSON.stringify(users, null, "\t")
      );

      const testSubModeText = `@${user?.nick}, Мы активировали трех дневный тестовый режим`;
      bot.sendMessage(chatId, testSubModeText);
      break;

    case "buySub":
      const buySubText = `@${user?.nick}, Отправьте скриншот в формате jpg, png`;
      bot.sendMessage(chatId, buySubText);
      bot.on("photo", handleSendReceipt);
      break;

    case "contactWithCreator":
      const contactWithCreatorText = `${process.env.ADMIN_URL}`;
      bot.sendMessage(chatId, contactWithCreatorText);
      break;

    case "addGroups":
      if (user?.haveSub) {
        const text = `Введите канал, группы через запятую пример:\nГруппа1, Группа2`;
        bot.sendMessage(chatId, text);
        bot.on("message", handleAddGroups);
      } else {
        bot.sendMessage(chatId, "У вас нету подписки");
      }

      break;

    case "addUsersToIgnore":
      if (user?.haveSub) {
        const text = `Введите пользователей которых хотите игнорировать во всех группах через запятую пример:\nПользователь1, Пользователь2`;
        bot.sendMessage(chatId, text);
        bot.on("message", handleAddIgnoredUsers);
      } else {
        bot.sendMessage(chatId, "У вас нету подписки");
      }

      break;

    case "addTextToGroup":
      if (user?.haveSub) {
        const text = `Введите текст который хотите добавить во всех группах пример:\nПривет\n\nМир!`;
        bot.sendMessage(chatId, text);
        bot.on("message", handleAddText);
      } else {
        bot.sendMessage(chatId, "У вас нету подписки");
      }

      break;

    case "changeButtons":
      if (user?.haveSub) {
        const text = `Введите кнопки в формате:\n(текст), (текст), ссылка\n\nПример:\nНе коммерческое, Админ, https://t.me/admin`;
        bot.sendMessage(chatId, text);
        bot.on("message", handleChangeButtons);
      } else {
        bot.sendMessage(chatId, "У вас нету подписки");
      }

      break;

    default:
      checkPaymentStatus(query);
      break;
  }
});

setInterval(() => {
  const tempUsers = JSON.parse(fs.readFileSync("./assets/data/users.json"));
  tempUsers.forEach((item) => {
    if (!item.subDays) {
      item.haveSub = false;
      item.subDays = null;
    } else {
      item.subDays -= 1;
    }

    fs.writeFileSync(
      "./assets/data/users.json",
      JSON.stringify(tempUsers, null, "\t")
    );
  });
}, 24 * 60 * 60 * 1000);

bot.on("polling_error", console.log);
