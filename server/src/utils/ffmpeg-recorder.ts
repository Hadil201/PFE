import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

const recordStreamInChunks = (streamUrl: string, chunkDuration: number) => {
    // Ensure output directory exists
    const outputDir = path.join(__dirname, '..', 'videos');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    ffmpeg(streamUrl)
        .inputOptions([
            '-re' // Read input at native frame rate (useful for real-time streams)
        ])
        .outputOptions([
            '-f segment',            // Use the segment muxer
            `-segment_time ${chunkDuration}`,      // Each chunk duration in seconds
            '-reset_timestamps 1',   // Reset timestamps at the start of each segment
            '-segment_format mp4',   // Format for the chunks
            '-strftime 1'            // Allow date formatting in filenames
        ])
        // The filename pattern: chunk_YYYY-MM-DD_HH-mm-ss.mp4
        .save(path.join(outputDir, 'chunk_%Y-%m-%d_%H-%M-%S.mp4'))
        .on('filenames', (filenames) => {
            console.log('Created segment files:', filenames);
        })
        .on('error', (err) => {
            console.error('Error during streaming:', err.message);
        })
        .on('end', () => {
            console.log('Stream recording ended.');
        });
};