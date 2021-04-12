import { BootstrapConsole, ConsoleModule, ConsoleService } from 'nestjs-console';
import { Injectable, Module } from '@nestjs/common';
import { Command } from 'commander';
import got from 'got';
import { hmacSignature } from './crypto';
import * as fs from 'fs';
import * as chalk from 'chalk';

const CSV_CONTENT_TYPE = 'text/csv';
const JSON_CONTENT_TYPE = 'application/json';

const logIt = (msg: string) => console.log(msg);

export interface CLIOptions {
    contentType?: string;
    identifier?: string;
    output?: string;
    verbose?: boolean;
}

@Injectable()
export class ClientApp {
    constructor(private readonly consoleService: ConsoleService) {
        const cli = this.consoleService.getCli();

        this.consoleService.createCommand(
            {
                command: 'get [url] [public-key] [private-key]',
                options: [
                    {
                        flags: '--identifier <string>',
                        required: false
                    },
                    {
                        flags: '--content-type <type>',
                        required: false,
                        description: 'specify content-type',
                        fn: (v): string => (/json/i.test(v) ? JSON_CONTENT_TYPE : /csv/.test(v) ? CSV_CONTENT_TYPE : v)
                    },
                    {
                        flags: '--output <filename>',
                        required: false,
                        description: 'output filename'
                    },
                    {
                        flags: '--verbose',
                        required: false,
                        description: 'enable verbose output'
                    }
                ]
            },
            async (url: string, publicKey: string, privateKey: string, command: Command) => {
                const opts = command.opts() as CLIOptions;
                await ClientApp.get(url, publicKey, privateKey, opts);
            },
            cli
        );
    }

    private static async get(url: string, publicKey: string, privateKey: string, options: CLIOptions) {
        const log = (msg: string) => options.verbose && log(chalk.green(msg));
        log(url);
        const date = new Date();
        const contentType = options?.contentType ?? JSON_CONTENT_TYPE;
        const requestMethod = 'GET';
        const identifier = options?.identifier ?? 'HMAC';
        log(contentType);
        log(date.toUTCString());
        log(identifier);
        const signature = hmacSignature({
            requestMethod,
            privateKey,
            contentType,
            date
        });
        const response = (await got(url, {
            method: 'GET',
            https: {
                rejectUnauthorized: false
            },
            headers: {
                accept: contentType,
                'Content-Type': contentType,
                Date: date.toUTCString(),
                Authorization: `${identifier} ${publicKey}:${signature}`
            },
            dnsCache: false
        })) as { statusCode: number; body: unknown };

        log(`${response.statusCode}`);

        if (options.output) {
            fs.writeFileSync(options.output, response.body as string);
            log(`Wrote output to ${options.output}`);
        } else {
            logIt(`${response.body}`);
        }
    }
}

@Module({
    imports: [ConsoleModule],
    providers: [ClientApp],
    exports: [ClientApp]
})
export class ClientAppModule {}

const bootstrap = new BootstrapConsole({
    module: ClientAppModule,
    useDecorators: true
});
bootstrap.init().then(async (app) => {
    try {
        await app.init();
        await bootstrap.boot();
        process.exit(0);
    } catch (e) {
        console.error('Error', e);
        process.exit(1);
    }
});
