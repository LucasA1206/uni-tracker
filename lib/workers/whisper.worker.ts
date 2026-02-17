/// <reference lib="webworker" />

import { pipeline } from '@xenova/transformers';

class AutomaticSpeechRecognitionPipeline {
    static task = 'automatic-speech-recognition' as const;
    static model = 'Xenova/whisper-tiny';
    static instance: any = null;

    static async getInstance(progress_callback?: Function) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event: any) => {
    const { audio } = event.data;

    // Run transcription
    try {
        const transcriber = await AutomaticSpeechRecognitionPipeline.getInstance((data: any) => {
            self.postMessage({
                status: 'progress',
                ...data,
            });
        });

        const result = await transcriber(audio, {
            chunk_length_s: 30,
            stride_length_s: 5,
            language: 'english',
            task: 'transcribe',
        });

        self.postMessage({
            status: 'complete',
            output: result,
        });
    } catch (error: any) {
        self.postMessage({
            status: 'error',
            error: error.message,
        });
    }
});
