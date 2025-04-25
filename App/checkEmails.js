const Imap = require('imap');
const dns = require('dns');
const fetchEmail = require('./fetchEmailDetails'); // <-- Импортируем новую функцию

// Функция для проверки почты (основная)
function checkEmails(emailConfig, rl) {
    // Оборачиваем в Promise, как и раньше
    return new Promise((resolveOuter, rejectOuter) => {
        console.log('\n--- Проверка почты ---');

        dns.lookup(emailConfig.imapHost, (err, address, family) => {
            if (err) {
                console.error(`Ошибка определения IP для ${emailConfig.imapHost}:`, err);
            } else {
                console.log(`Попытка подключения к IMAP серверу: ${emailConfig.imapHost} (${address})`);
            }

            const imap = new Imap({
                user: emailConfig.user,
                password: emailConfig.password,
                host: emailConfig.imapHost,
                port: emailConfig.imapPort,
                tls: true,
                tlsOptions: { rejectUnauthorized: false }
            });

            function openInbox(cb) {
                imap.openBox('INBOX', false, cb);
            }

            imap.once('ready', function () {
                console.log(`✓ Успешная авторизация для ${emailConfig.user}`);

                openInbox(function (err, box) {
                    if (err) {
                        console.error('Ошибка при открытии INBOX:', err);
                        rejectOuter(err);
                        return;
                    }

                    console.log(`\nКоличество писем в ящике: ${box.messages.total}`);
                    if (box.messages.total === 0) {
                        console.log('Входящих писем нет.');
                        imap.end();
                        resolveOuter();
                        return;
                    }
                    console.log('Последние 5 писем:');

                    const fetchRange = `${Math.max(1, box.messages.total - 4)}:${box.messages.total}`;
                    const f = imap.seq.fetch(fetchRange, {
                        bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
                        struct: true
                    });

                    let headers = [];

                    f.on('message', function (msg, seqno) {
                        msg.on('body', function (stream, info) {
                            let buffer = '';
                            stream.on('data', function (chunk) { buffer += chunk.toString('utf8'); });
                            stream.once('end', function () {
                                const header = Imap.parseHeader(buffer);
                                headers.push({
                                    seqno,
                                    from: header.from ? header.from[0] : 'Неизвестно',
                                    subject: header.subject ? header.subject[0] : 'Без темы',
                                    date: header.date ? new Date(header.date[0]).toLocaleString() : 'Дата неизвестна'
                                });
                            });
                        });
                    });

                    f.once('error', function (err) {
                        console.error('Ошибка при получении заголовков:', err);
                        rejectOuter(err);
                        if (imap.state === 'authenticated') { try { imap.end(); } catch(e){} }
                    });

                    f.once('end', function () {
                        headers.sort((a, b) => a.seqno - b.seqno);

                        headers.forEach(header => {
                            console.log(`\n#${header.seqno}`);
                            console.log(`От: ${header.from}`);
                            console.log(`Тема: ${header.subject}`);
                            console.log(`Дата: ${header.date}`);
                        });

                        // Запрос номера и вызов импортированной функции fetchEmail
                        rl.question('\nВведите номер письма для получения полного текста (#) или 0 для выхода: ', (seqnoInput) => {
                            const seqno = parseInt(seqnoInput);

                            if (isNaN(seqno)) {
                                 console.error('Неверный номер письма.');
                                 if (imap.state === 'authenticated') { try { imap.end(); } catch(e){} }
                                 rejectOuter(new Error('Неверный номер письма'));
                                 return;
                            }
                            if (seqno <= 0) {
                                console.log('Выход из просмотра почты.');
                                if (imap.state === 'authenticated') { try { imap.end(); } catch(e){} }
                                resolveOuter();
                                return;
                            }

                            // Вызов импортированной функции
                            fetchEmail(imap, seqno)
                                .then(resolveOuter)
                                .catch(rejectOuter);
                        });
                    });
                });
            });

            imap.once('error', function (err) {
                console.error('Ошибка IMAP соединения:', err);
                rejectOuter(err);
            });

            imap.once('end', function () {
                console.log('IMAP соединение закрыто');
            });

            imap.connect();
        }); // Конец callback dns.lookup
    });
}

module.exports = checkEmails;