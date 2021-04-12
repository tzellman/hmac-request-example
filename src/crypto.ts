import { createHash, createHmac } from 'crypto';
import * as CryptoJS from 'crypto-js';
import * as uuid from 'uuid';

const JSON_TYPES = [
    'application/json',
    'application/json-patch+json',
    'application/vnd.api+json',
    'application/csp-report'
];

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL' | 'OPTIONS' | 'HEAD';

export interface HMACSignOptions {
    privateKey: string;
    requestMethod: RequestMethod;
    date: Date;
    contentType?: string;
    requestBody?: unknown;
    driver?: 'crypto' | 'cryptojs';
}

export const hmacSignature = (options: HMACSignOptions): string => {
    const contentType = (options.contentType ?? '').split(';')[0];

    // default requestBody if undefined, to match passport-hmac
    const body = JSON_TYPES.some((t) => new RegExp(t, 'i').test(contentType))
        ? JSON.stringify(options.requestBody ?? {})
        : '';

    switch (options.driver) {
        case 'cryptojs':
            return signWithCryptoJS({ ...options, body, contentType });
        case 'crypto':
        default:
            return signWithNodeCrypto({ ...options, body, contentType });
    }
};

interface HMACMeta extends Omit<HMACSignOptions, 'requestBody' | 'contentType' | 'driver'> {
    body: string;
    contentType: string;
}

const signWithNodeCrypto = (options: HMACMeta): string =>
    // order of positional params is documented here: https://github.com/chatter/passport-hmac
    createHmac('sha1', options.privateKey)
        .update(
            Buffer.from(
                [
                    options.requestMethod,
                    createHash('md5').update(options.body, 'utf8').digest('hex'),
                    options.contentType,
                    options.date.toUTCString()
                ].join('\n'),
                'utf-8'
            )
        )
        .digest('base64');

// If using a client from JS, this is likely the exact code you would use to generate the signature
const signWithCryptoJS = (options: HMACMeta): string =>
    CryptoJS.enc.Base64.stringify(
        CryptoJS.HmacSHA1(
            unescape(
                encodeURIComponent(
                    [
                        options.requestMethod,
                        CryptoJS.MD5(options.body),
                        options.contentType,
                        options.date.toUTCString()
                    ].join('\n')
                )
            ),
            options.privateKey
        )
    );

export const generateHmacKeys = (): { privateKey: string; publicKey: string } => {
    const privateKey = createHash('sha1').update(uuid.v4(), 'utf8').digest('base64');

    // sign the public key w/the private - this will let us know that we generated it
    const publicKey = createHmac('sha1', privateKey)
        .update(Buffer.from(createHash('md5').update(privateKey, 'utf8').digest('hex'), 'utf-8'))
        .digest('base64');
    return { privateKey, publicKey };
};
