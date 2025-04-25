const { simpleParser } = require('mailparser');
const fs = require('fs'); 

// Функция для получения и отображения полного письма
async function fetchEmail(imap, seqno) {
    return new Promise((resolve, reject) => {
        console.log(`\n--- Получение полного текста письма #${seqno} ---`);
        if (!imap || !imap.seq || imap.state !== 'authenticated') {
             return reject(new Error("IMAP соединение не готово для fetch."));
        }

        const f = imap.seq.fetch(seqno, { bodies: '' }); // Запрос всего тела 
        let fullEmailData = ''; // Буфер для необработанных данных письма

        f.on('message', function (msg, seqno) {
            msg.on('body', function (stream, info) {
                // Собираем данные письма из потока
                stream.on('data', function (chunk) {
                    fullEmailData += chunk.toString('utf8');
                });
            });
            msg.once('end', function () {
                // console.log(` Необработанные данные письма #${seqno} получены.`);
            });
        });

        f.once('error', (err) => {
             console.error(`Ошибка fetch для письма #${seqno}:`, err);
             reject(err);
             // Закрываем соединение даже при ошибке fetch
             if (imap.state === 'authenticated') {
                try { imap.end(); } catch(e) { console.error("Ошибка при закрытии IMAP после fetch error:", e); }
             }
        });

        // Когда все данные письма загружены
        f.once('end', async function () {
            console.log('Разбор письма с помощью mailparser...');
            try {
                // Асинхронный парсинг MIME-данных
                const parsed = await simpleParser(fullEmailData);

                console.log('\n========== Начало письма ==========');
                console.log('От:', parsed.from?.text || 'Неизвестно');
                console.log('Кому:', parsed.to?.text || 'Неизвестно');
                console.log('Тема:', parsed.subject || 'Без темы');
                console.log('Дата:', parsed.date ? parsed.date.toLocaleString() : 'Дата неизвестна');
                console.log('--- Текст письма ---');
                // Отображаем текстовую часть, если есть, иначе HTML (или сообщение об отсутствии)
                if (parsed.text) {
                    console.log(parsed.text);
                } else if (parsed.html) {
                    console.log('(Письмо содержит HTML, текстовая версия отсутствует)');
                } else {
                    console.log('(Текстовое содержимое не найдено)');
                }
                console.log('========== Конец письма ==========');


                // Обработка вложений
                if (parsed.attachments && parsed.attachments.length > 0) {
                    console.log('\n--- Найденные вложения ---');
                    parsed.attachments.forEach(attachment => {
                        console.log(`- Имя файла: ${attachment.filename} (${attachment.contentType}, ${attachment.size} байт)`);
                        try {
                            fs.writeFileSync(attachment.filename, attachment.content); // <-- Закомментировано
                            console.log(`  ✓ Файл "${attachment.filename}" сохранен.`);
                        } 
                        catch (writeErr) {
                            console.error(`  ✗ Ошибка сохранения файла "${attachment.filename}":`, writeErr);
                        }
                    });
                }

                resolve(); // Успешное завершение промиса fetchEmail
            } catch (parseErr) {
                console.error('Ошибка разбора письма:', parseErr);
                reject(parseErr); // Отклонение промиса при ошибке парсинга
            } finally {
                 // Закрываем соединение после успешного получения и разбора ИЛИ ошибки парсинга
                 if (imap.state === 'authenticated') {
                    try { imap.end(); } catch(e) { console.error("Ошибка при закрытии IMAP после обработки:", e); }
                 }
            }
        });
    });
}

module.exports = fetchEmail;