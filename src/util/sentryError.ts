const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'https://1aca629ca89c42a6b5601fcce6499103@sentry.slock.it/5' });

export class SentryError extends Error {
    constructor(message? :string, category_info? :string, breadcrumb_message? :string) {
        super(message);

        Sentry.addBreadcrumb({
            category: category_info,
            message: breadcrumb_message,
        });

        Sentry.captureException(message)
    }
}