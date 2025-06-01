// This file is machine-generated - edit with caution!

'use server';

/**
 * @fileOverview An AI agent that fills a selected area of an image with contextually relevant content.
 *
 * - generateFillWithContext - A function that handles the image inpainting process.
 * - GenerateFillWithContextInput - The input type for the generateFillWithContext function.
 * - GenerateFillWithContextOutput - The return type for the generateFillWithContext function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFillWithContextInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      'A photo to be inpainted, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // keep the single quotes in the description
    ),
  selectionDataUri: z
    .string()
    .describe(
      'A data URI of a black and white image where white pixels indicate the area to be inpainted. It must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // keep the single quotes in the description
    ),
});
export type GenerateFillWithContextInput = z.infer<
  typeof GenerateFillWithContextInputSchema
>;

const GenerateFillWithContextOutputSchema = z.object({
  inpaintedPhotoDataUri: z
    .string()
    .describe(
      'The inpainted photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type GenerateFillWithContextOutput = z.infer<
  typeof GenerateFillWithContextOutputSchema
>;

export async function generateFillWithContext(
  input: GenerateFillWithContextInput
): Promise<GenerateFillWithContextOutput> {
  return generateFillWithContextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFillWithContextPrompt',
  input: {schema: GenerateFillWithContextInputSchema},
  output: {schema: GenerateFillWithContextOutputSchema},
  prompt: [
    {media: {url: '{{{photoDataUri}}}'}},
    {
      text:
        'I want you to fill in the area indicated in this picture, using the context of the surrounding image.'
    },
  ],
  config: {
    responseModalities: ['TEXT', 'IMAGE']
  }
});

const generateFillWithContextFlow = ai.defineFlow(
  {
    name: 'generateFillWithContextFlow',
    inputSchema: GenerateFillWithContextInputSchema,
    outputSchema: GenerateFillWithContextOutputSchema,
  },
  async input => {
    const {
      photoDataUri,
      selectionDataUri,
    } = input;

    // Call Gemini with the image and the selection area to generate the inpainted image.
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: [
        {media: {url: photoDataUri}},
        {media: {url: selectionDataUri}},
        {
          text:
            'Fill the white area indicated in the second image, using the context of the first image.'
        },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {inpaintedPhotoDataUri: media.url!};
  }
);
