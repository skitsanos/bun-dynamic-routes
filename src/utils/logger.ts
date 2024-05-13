/**
 * Application logging for bun driven applications
 * @version 1.0.0
 * @author skitsanos, http://github.com/skitsanos
 */
import {hostname} from 'os';
import dayjs from 'dayjs';


enum ERR_TYPE
{
    INFO,
    WARN,
    ERROR,
    TRACE
}

class Logger
{
    static writeLog(level: ERR_TYPE, data: any)
    {
        const host = hostname();

        const log = [
            dayjs().format('YYYY-MM-DD hh:mm:ss'),
            ' ',
            host,
            ' '
        ];

        if (process.env.NODE_ENV !== 'production')
        {
            switch (level)
            {
                case ERR_TYPE.INFO:
                    log.push('\u001b[34m[info]\u001b[0m ');
                    break;

                case ERR_TYPE.WARN:
                    log.push('\u001b[33m[warn]\u001b[0m ');
                    break;

                case ERR_TYPE.ERROR:
                    log.push('\u001b[31m[error]\u001b[0m ');
                    break;

                default:
                    log.push('\u001b[0m[trace]\u001b[0m ');
                    break;
            }
            log.push(data, '\n');
            Bun.write(Bun.stdout, log.join(''));
        }

    }

    static info(data: any)
    {
        this.writeLog(ERR_TYPE.INFO, data);
    }

    static warn(data: any)
    {
        this.writeLog(ERR_TYPE.WARN, data);
    }

    static error(data: any)
    {
        this.writeLog(ERR_TYPE.ERROR, data);
    }

    static log(data: any)
    {
        this.writeLog(ERR_TYPE.TRACE, data);
    }
}

export default Logger;