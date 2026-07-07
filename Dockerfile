# ProLab Performance — imagem de produção (Render web service)
FROM php:8.3-apache

# Extensões PDO: PostgreSQL (Render) + MySQL (compatibilidade)
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq-dev \
 && docker-php-ext-install -j"$(nproc)" pdo_pgsql pdo_mysql \
 && rm -rf /var/lib/apt/lists/*

RUN a2enmod rewrite headers

# Docroot = /public (o resto do código fica fora do alcance do browser)
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
 && printf '<Directory ${APACHE_DOCUMENT_ROOT}>\n  AllowOverride All\n  Require all granted\n</Directory>\n' \
      > /etc/apache2/conf-available/prolab.conf \
 && a2enconf prolab

# O Render injeta PORT; o Apache escuta nela (default 10000 para uso local)
ENV PORT=10000
RUN sed -ri 's/Listen 80/Listen ${PORT}/' /etc/apache2/ports.conf \
 && sed -ri 's/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/' /etc/apache2/sites-available/000-default.conf

COPY . /var/www/html

# Diretório de dados (só usado com SQLite; com DATABASE_URL é ignorado)
RUN mkdir -p /var/www/html/data \
 && chown -R www-data:www-data /var/www/html/data

EXPOSE 10000

CMD ["apache2-foreground"]
