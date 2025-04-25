const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path'); 
const dns = require('dns'); // Добавлен импорт DNS

// Функция для отправки письма
async function sendEmail(emailConfig, rl) {
    return new Promise((resolve, reject) => {
        console.log('\n--- Отправка сообщения ---');

        // Получение данных для письма от пользователя
        rl.question('Email получателя: ', (recipient) => {
            rl.question('Название лабораторной работы (тема): ', (subject) => { // Используем 'subject' как в коде
                rl.question('Ваше ФИО: ', (senderName) => {
                    rl.question('Ваша группа: ', (senderGroup) => {
                        rl.question('ФИО получателя: ', (recipientName) => {
                            rl.question('Группа получателя: ', (recipientGroup) => {
                                rl.question('Путь к прикрепляемому файлу (оставьте пустым если нет): ', (attachmentPath) => {

                                    
                                    // Определяем IP адрес SMTP сервера перед подключением
                                    dns.lookup(emailConfig.smtpHost, (err, address, family) => {
                                        if (err) {
                                            console.error(`Ошибка определения IP для ${emailConfig.smtpHost}:`, err);
                                            
                                        } else {
                                            // Выводим IP адрес
                                            console.log(`Попытка подключения к SMTP серверу: ${emailConfig.smtpHost} (${address})`);
                                        }

                                        // Создание транспорта и отправка ПЕРЕМЕЩЕНЫ ВНУТРЬ callback'а
                                        const transporter = nodemailer.createTransport({
                                            host: emailConfig.smtpHost,
                                            port: emailConfig.smtpPort,
                                            secure: emailConfig.smtpPort === 465,
                                            auth: {
                                                user: emailConfig.user,
                                                pass: emailConfig.password,
                                            },
                                        });

                                        const now = new Date();
                                        const mailOptions = {
                                            from: `"${senderName}" <${emailConfig.user}>`,
                                            to: recipient,
                                            subject: subject,
                                            priority: 'high',
                                            text: `Отправитель: ${senderName}, группа ${senderGroup}\nПолучатель: ${recipientName}, группа ${recipientGroup}\nВремя отправки: ${now.toLocaleString()}`,
                                            headers: {
                                                'Importance': 'high',
                                                'X-Priority': '1'
                                            }
                                        };

                                        // Добавление вложения
                                        if (attachmentPath && attachmentPath.trim() !== '') {
                                            const trimmedPath = attachmentPath.trim(); // Используем trimmedPath
                                            try {
                                                if (fs.existsSync(trimmedPath)) {
                                                    mailOptions.attachments = [
                                                        {
                                                            // Используем path.basename для корректного извлечения имени файла
                                                            filename: path.basename(trimmedPath),
                                                            path: trimmedPath
                                                        }
                                                    ];
                                                    console.log(`Прикрепляемый файл: ${path.basename(trimmedPath)}`);
                                                } else {
                                                    console.error(`Ошибка: Файл не найден: ${trimmedPath}`);
                                                }
                                            } catch (err) {
                                                console.error('Ошибка с вложением:', err);
                                            }
                                        }

                                        // Отправка письма
                                        transporter.sendMail(mailOptions, (error, info) => {
                                            if (error) {
                                                console.error('Ошибка при отправке:', error);
                                                reject(error);
                                            } else {
                                                console.log('Сообщение отправлено:', info.messageId);
                                                resolve(info);
                                            }
                                        });
                                        

                                    }); // Закрытие callback для dns.lookup
                                   
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

module.exports = sendEmail;