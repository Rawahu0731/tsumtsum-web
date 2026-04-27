const DEFAULT_TESSERACT_LANG = 'jpn';

type LoggerMessage = {
    status?: string;
    progress?: number;
};

export type TesseractWorker = {
    recognize: (image: Blob | File) => Promise<{ data?: { text?: string }; text?: string }>;
    terminate: () => Promise<void> | void;
    load?: () => Promise<void>;
    loadLanguage?: (lang: string) => Promise<void>;
    initialize?: (lang: string) => Promise<void>;
    setParameters?: (params: Record<string, string | number>) => Promise<void>;
};

export type CreateLocalTesseractWorkerOptions = {
    lang?: string;
    logger?: (message: LoggerMessage) => void;
    parameters?: Record<string, string | number>;
};

type WorkerFactory = (...args: unknown[]) => unknown;

type TesseractModule = {
    createWorker?: WorkerFactory;
    default?: WorkerFactory | { createWorker?: WorkerFactory };
};

const resolvePublicPath = (relativePath: string) => {
    const base = import.meta.env.BASE_URL || '/';
    const normalizedBase = base.replace(/\/+$/, '');
    const normalizedPath = relativePath.replace(/^\/+/, '');
    return `${normalizedBase}/${normalizedPath}`;
};

export const LOCAL_TESSERACT_OPTIONS = {
    workerPath: resolvePublicPath('/worker.min.js'),
    corePath: resolvePublicPath('/tesseract-core.wasm.js'),
    langPath: resolvePublicPath('/tessdata'),
    workerBlobURL: false,
    gzip: false,
} as const;

const resolveCreateWorker = async (): Promise<WorkerFactory> => {
    const mod = (await import('tesseract.js')) as TesseractModule;
    const fromDefaultObject =
        mod.default && typeof mod.default === 'object' ? mod.default.createWorker : undefined;
    const candidate = mod.createWorker || fromDefaultObject || mod.default;
    if (typeof candidate !== 'function') {
        throw new Error('Failed to resolve tesseract.js createWorker().');
    }
    return candidate;
};

const initializeV4WorkerIfNeeded = async (worker: TesseractWorker, lang: string) => {
    if (typeof worker.load === 'function') {
        await worker.load();
    }
    if (typeof worker.loadLanguage === 'function') {
        await worker.loadLanguage(lang);
    }
    if (typeof worker.initialize === 'function') {
        await worker.initialize(lang);
    }
};

const applyParametersIfSupported = async (
    worker: TesseractWorker,
    parameters?: Record<string, string | number>,
) => {
    if (!parameters) return;
    if (typeof worker.setParameters === 'function') {
        await worker.setParameters(parameters);
    }
};

const assertWorkerShape = (worker: unknown): TesseractWorker => {
    if (!worker || typeof worker !== 'object') {
        throw new Error('OCR worker does not expose recognize().');
    }

    const candidate = worker as Partial<TesseractWorker>;
    if (typeof candidate.recognize !== 'function') {
        throw new Error('OCR worker does not expose recognize().');
    }
    if (typeof candidate.terminate !== 'function') {
        throw new Error('OCR worker does not expose terminate().');
    }
    return candidate as TesseractWorker;
};

const normalizeCreateOptions = (
    optionsOrLogger?: CreateLocalTesseractWorkerOptions | ((message: LoggerMessage) => void),
): CreateLocalTesseractWorkerOptions => {
    if (typeof optionsOrLogger === 'function') {
        return { logger: optionsOrLogger };
    }
    return optionsOrLogger ?? {};
};

export async function createLocalTesseractWorker(
    optionsOrLogger?: CreateLocalTesseractWorkerOptions | ((message: LoggerMessage) => void),
) {
    const createWorkerFn = await resolveCreateWorker();
    const normalized = normalizeCreateOptions(optionsOrLogger);
    const lang = normalized.lang ?? DEFAULT_TESSERACT_LANG;

    const options = {
        ...LOCAL_TESSERACT_OPTIONS,
        logger: normalized.logger,
    };

    try {
        const worker = assertWorkerShape(await Promise.resolve(createWorkerFn(options)));
        await initializeV4WorkerIfNeeded(worker, lang);
        await applyParametersIfSupported(worker, normalized.parameters);
        return worker;
    } catch {
        const worker = assertWorkerShape(
            await Promise.resolve(createWorkerFn(lang, 1, options)),
        );
        await initializeV4WorkerIfNeeded(worker, lang);
        await applyParametersIfSupported(worker, normalized.parameters);
        return worker;
    }
}
