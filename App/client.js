const fs = require('fs');
const path = require('path');
const readline = require('readline');
const sendEmail = require('./sendEmail');
const checkEmails = require('./checkEmails');

// Создание интерфейса командной строки для пользовательского ввода
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Загрузка конфигурации электронной почты из JSON файла
let emailConfig;
try {
    const configPath = path.join(__dirname, '..', 'Config', 'emailConfig.JSON');
    const configData = fs.readFileSync(configPath, 'utf8');
    emailConfig = JSON.parse(configData);
    console.log('Конфигурация электронной почты успешно загружена');
} catch (error) {
    console.error('Ошибка при загрузке конфигурации:', error.message);
    console.error('Убедитесь, что файл emailConfig.JSON существует в директории Config и содержит корректный JSON');
    process.exit(1);
}

async function main() {
    console.log('=== Почтовый клиент ===');

    try {
        rl.question('Что вы хотите сделать? (1 - Отправить письмо, 2 - Проверить почту): ', async (choice) => {
            if (choice === '1') {
                await sendEmail(emailConfig, rl);
            } else if (choice === '2') {
                await checkEmails(emailConfig, rl);
            } else {
                console.log('Неверный выбор');
            }

            rl.close();
        });
    } catch (error) {
        console.error('Произошла ошибка:', error);
        rl.close();
    }
}

main();