# Развертывание на Timeweb Cloud Server

Для сайта нужен Cloud Server/VDS в российском регионе, а не Timeweb App Platform. Авторитетная SQLite-база, постоянный диск и системный cron требуют root-доступа и управляемого серверного окружения.

## Подготовка VDS

1. Создайте VDS с актуальным Debian или Ubuntu в российском дата-центре Timeweb.
2. Добавьте DNS-записи `A` и при наличии IPv6 `AAAA` финального домена на адрес VDS.
3. Обновите систему, подключите официальные APT-репозитории Docker и Caddy, установите Docker Engine, Compose plugin версии 2.30 или новее и Caddy:

```bash
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin caddy
sudo systemctl enable --now docker caddy
```

4. Разрешите в firewall TCP-порты `80` и `443`, а `22` оставьте только для доверенного административного IP. Порт приложения `4321` наружу не открывайте.
5. Разместите репозиторий, например, в `/opt/nina-tutor`, и выполняйте дальнейшие команды из этого каталога.

## Конфигурация и запуск

Создайте `.env.production` из `.env.example`, установите права `600` и задайте все значения:

```dotenv
SITE_URL=https://FINAL_DOMAIN
PUBLIC_YANDEX_METRICA_ID=
LEADS_DB_PATH=/data/leads.db
LEADS_BACKUP_DIR=/data/backups
LEAD_NOTIFICATION_EMAIL=<ящик-в-россии>
TRUSTED_PROXY_HEADER=x-real-ip
SMTP_HOST=<smtp-в-россии>
SMTP_PORT=465
SMTP_USER=<пользователь>
SMTP_PASSWORD=<пароль>
SMTP_FROM=<ящик-в-россии>
SMTP_SECURE=true
RATE_LIMIT_SECRET=<случайный-секрет-не-короче-32-символов>
```

`SITE_URL` должен быть финальным HTTPS origin без завершающего `/`; одно и то же значение используется при сборке и в runtime. Пустой `PUBLIC_YANDEX_METRICA_ID` отключает Метрику, изменение ID требует новой сборки. Используйте доменный ящик и SMTP, размещенные в России. `RATE_LIMIT_SECRET` можно создать командой `openssl rand -hex 32`. Секреты хранятся только в `.env.production` на VDS и не передаются как build args.

Проверьте и запустите Compose:

```bash
chmod 600 .env.production
unset SITE_URL PUBLIC_YANDEX_METRICA_ID
docker compose --env-file .env.production config --quiet
docker compose --env-file .env.production build --pull
docker compose --env-file .env.production up -d
docker compose --env-file .env.production ps
```

Compose 2.30+ загружает runtime-переменные из `.env.production` в формате `raw`, поэтому `$` и другие символы в секретах сохраняются буквально. `SITE_URL` и опциональный ID Метрики передаются в сборку и явно переопределяются в runtime из одной интерполяции, поэтому внутри одного запуска они не расходятся. Переменные текущей shell имеют приоритет при интерполяции: перед проверкой и сборкой обязательно выполните указанный `unset` и проверьте значения в `.env.production`, чтобы не собрать образ для неверного домена. Не запускайте `docker compose config` без `--quiet` в CI или журналируемой shell: разрешенная конфигурация содержит секреты.

`compose.yaml` публикует приложение только на `127.0.0.1:4321` и монтирует именованный том в `/data`. Образ запускается от пользователя `node`; новый именованный том получает подготовленные в образе права на `/data` и `/data/backups`.

Именованный том сохраняется при `docker compose down` и повторном создании контейнера. Команда `docker compose down -v` удаляет базу и резервные копии: на рабочем сервере ее применять нельзя.

Если вместо именованного тома нужен bind mount, сначала создайте каталог с UID/GID пользователя `node` из официального образа (`1000:1000`), затем замените volume в Compose:

```bash
sudo install -d -m 0700 -o 1000 -g 1000 /srv/nina-tutor/data /srv/nina-tutor/data/backups
```

Каталог bind mount закрыт от остальных пользователей VDS; дополнительно проверьте права создаваемых SQLite-файлов с учетом host/container umask.

Образ можно собирать на VDS приведенной командой или в CI с теми же публичными build args и публиковать в registry. Для CI-развертывания замените `build` на закрепленный `image` digest в серверной конфигурации; runtime-секреты в образ не включайте.

## HTTPS, proxy и сжатие

Укажите финальный домен в `/etc/caddy/Caddyfile`:

```caddyfile
FINAL_DOMAIN {
  encode zstd gzip

  reverse_proxy 127.0.0.1:4321 {
    header_up X-Real-IP {remote_host}
  }
}
```

Проверьте конфигурацию и перезагрузите Caddy:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy получает сертификат автоматически, сжимает ответы и всегда перезаписывает входной `X-Real-IP` адресом непосредственного клиента. Поскольку контейнер доступен только через loopback, прямой клиент не может обойти proxy или подменить доверенный заголовок. Для приложения установлено `TRUSTED_PROXY_HEADER=x-real-ip`; перед запуском подтвердите это поведение фактическим запросом и журналом. Допустимые значения приложения: `x-real-ip`, `cf-connecting-ip`, `x-forwarded-for`.

После HTTPS-развертывания найдите хешированный CSS в HTML и проверьте сжатие обоих ответов:

```bash
curl -I -H 'Accept-Encoding: br,gzip' https://FINAL_DOMAIN/
CSS_PATH=$(curl -fsS https://FINAL_DOMAIN/ | grep -oE '/_astro/[^" ]+\.css' | head -n 1)
test -n "$CSS_PATH"
curl -I -H 'Accept-Encoding: br,gzip' "https://FINAL_DOMAIN${CSS_PATH}"
```

Главная и CSS должны возвращать `Content-Encoding: gzip` (или `br`, если proxy настроен на Brotli) и желательно `Vary: Accept-Encoding`. Astro standalone сам ответы не сжимает; при отсутствии заголовка исправьте proxy до финального Lighthouse.

Проверка здоровья:

```bash
curl -fsS https://FINAL_DOMAIN/api/health
```

Ожидаются HTTP `200` и `{"ok":true}`.

## Резервные копии

Backup запускается системным cron на VDS, а не планировщиком App Platform. Добавьте в root crontab ежедневный запуск из каталога проекта:

```cron
17 3 * * * cd /opt/nina-tutor && /usr/bin/flock -n /run/lock/nina-backup.lock /usr/bin/docker compose --env-file .env.production exec -T app npm run backup >> /var/log/nina-backup.log 2>&1
```

Проверьте команду вручную до включения расписания:

```bash
cd /opt/nina-tutor
docker compose --env-file .env.production exec -T app npm run backup
```

Скрипт создает завершенный SQLite backup в `/data/backups`, атомарно публикует его без перезаписи и печатает только путь. Он не удаляет старые копии. Настройте срок хранения, шифрование и регулярное копирование в отдельное российское хранилище или на другой VDS. Копия в том же Docker volume защищает от ошибки файла, но не является disaster recovery при потере VDS или диска.

## Повтор уведомлений

Если SMTP временно недоступен, заявка остается в базе со статусом `failed`, а системный cron на VDS повторяет отправку каждые 5 минут. Добавьте отдельную строку в root crontab:

```cron
*/5 * * * * cd /opt/nina-tutor && /usr/bin/flock -n /run/lock/nina-notification-retry.lock /usr/bin/docker compose --env-file .env.production exec -T app npm run retry:notifications >> /var/log/nina-notification-retry.log 2>&1 || /usr/bin/logger -p user.err -t nina-notification-retry "notification retry command failed"
```

Настройте мониторинг сообщений `nina-notification-retry` в системном журнале как alert. Скрипт обрабатывает до 20 самых старых записей `failed`, после успешной отправки меняет статус на `sent`, продолжает пакет после отдельной ошибки и возвращает ненулевой код при ошибке отправки или конфликте статуса. В cron-журнал попадают только ID заявок и счетчики статусов, без имени, контакта и текста обращения. Периодически проверяйте число и ID записей `failed`; их содержимое не выводите в журнал.

Доставка имеет семантику at-least-once: если процесс завершится после принятия письма SMTP-сервером, но до обновления SQLite, письмо может быть отправлено повторно. ID заявки в теме позволяет распознать такой дубликат.

Перед запуском временно направьте приложение на локальный или тестовый SMTP в российской инфраструктуре, вызовите контролируемый отказ, восстановите SMTP и запустите команду вручную:

```bash
cd /opt/nina-tutor
docker compose --env-file .env.production exec -T app npm run retry:notifications
```

Убедитесь, что одна запись перешла из `failed` в `sent`, письмо получено один раз, а повторный запуск сообщает нулевое число записей. Не используйте Gmail для этой проверки. Ежедневный backup остается отдельной обязательной задачей cron.

## Восстановление

Сначала скопируйте выбранный backup за пределы VDS и убедитесь, что он открывается как SQLite. Затем остановите приложение и восстановите файл через одноразовый контейнер с тем же томом:

```bash
docker compose --env-file .env.production stop app
BACKUP_FILE=leads-YYYY-MM-DDTHH-MM-SS-sssZ-UUID.db \
  docker compose --env-file .env.production run --rm --no-deps \
  -e BACKUP_FILE --entrypoint sh app -c '
    set -eu
    recovery="/data/restore-safety-$(date -u +%Y%m%dT%H%M%SZ)"
    mkdir "$recovery"
    for file in /data/leads.db /data/leads.db-wal /data/leads.db-shm; do
      [ ! -e "$file" ] || cp "$file" "$recovery/"
    done
    cp "/data/backups/$BACKUP_FILE" /data/leads.db.restore
    mv /data/leads.db.restore /data/leads.db
    rm -f /data/leads.db-wal /data/leads.db-shm
  '
docker compose --env-file .env.production up -d app
curl -fsS https://FINAL_DOMAIN/api/health
```

Проверьте ожидаемую запись. При ошибке снова остановите приложение и верните файлы из созданного `/data/restore-safety-*`.

## Проверка перед запуском

- Получено разрешение на публикацию фотографии ребенка.
- Специалист проверил `/privacy/`, `/consent/` и процедуры оператора персональных данных.
- Финальный домен, DNS, HTTPS, runtime `SITE_URL`, canonical URL и sitemap совпадают.
- ID Метрики согласован и передан при сборке; до согласия посетителя запросов Метрики нет, после согласия проверены только утвержденные цели.
- Активированы российский доменный ящик, SMTP и адрес получателя уведомлений.
- Caddy перезаписывает `X-Real-IP`, порт `4321` недоступен извне, сжатие HTML/CSS подтверждено.
- Одна реальная заявка без чувствительных данных создала одну строку в `/data/leads.db` и одно уведомление в российском ящике; повторная доставка того же запроса не создает дубликат.
- После `docker compose up -d --force-recreate app` сохраненная строка остается в именованном томе.
- Host cron создает читаемый backup; утверждены хранение, шифрование, off-host копирование и пробное восстановление.
- Host cron повторяет SMTP-уведомления; временный отказ и восстановление меняют одну запись `failed` на `sent`, повторный запуск обрабатывает ноль записей, а ненулевой код вызывает alert.
- `/api/health` отвечает HTTP `200` через публичный HTTPS-адрес.
- После включения сжатия один мобильный Lighthouse запущен с холодной загрузкой публичного HTTPS-адреса: Performance, Accessibility, Best Practices и SEO не ниже 95, LCP меньше 2,5 с, CLS меньше 0,1. Проверка блокирует запуск до появления финального домена и VDS.

Локальная диагностика без proxy-сжатия показывала Performance 94 и LCP 2,56 с с внешним CSS. Принудительное встраивание CSS ухудшило результат и было удалено; локальный Performance не считается пройденной приемкой.

Не настраивайте автоматическую отправку содержимого формы в Gmail без отдельной проверки трансграничной обработки. Указанный на сайте Gmail остается только прямой ссылкой `mailto:`, которую посетитель открывает по собственной инициативе.
