'use server';

/**
 * @fileOverview AI flow for generating an image fill based on a text prompt and a selected area.
 *
 * - generateFillWithPrompt - A function that handles the image fill generation process.
 * - GenerateFillWithPromptInput - The input type for the generateFillWithPrompt function.
 * - GenerateFillWithPromptOutput - The return type for the generateFillWithPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFillWithPromptInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      'A photo to be inpainted, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  selectionDataUri: z
    .string()
    .describe(
      'The selected area to be inpainted, as a data URI that must include a MIME type and use Base64 encoding.  Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  prompt: z.string().describe('The prompt to guide the image generation.'),
});
export type GenerateFillWithPromptInput = z.infer<typeof GenerateFillWithPromptInputSchema>;

const GenerateFillWithPromptOutputSchema = z.object({
  inpaintedPhotoDataUri: z
    .string()
    .describe('The inpainted photo, as a data URI.'),
});
export type GenerateFillWithPromptOutput = z.infer<typeof GenerateFillWithPromptOutputSchema>;

export async function generateFillWithPrompt(input: GenerateFillWithPromptInput): Promise<GenerateFillWithPromptOutput> {
  return generateFillWithPromptFlow(input);
}

const generateFillWithPromptPrompt = ai.definePrompt({
  name: 'generateFillWithPromptPrompt',
  input: {schema: GenerateFillWithPromptInputSchema},
  output: {schema: GenerateFillWithPromptOutputSchema},
  prompt: `Inpaint the selected area of the image with content relevant to the prompt. Return the complete image with the replaced content.

Selected area: {{media url=selectionDataUri}}
Image: {{media url=photoDataUri}}
Prompt: {{{prompt}}}`,
});

const generateFillWithPromptFlow = ai.defineFlow(
  {
    name: 'generateFillWithPromptFlow',
    inputSchema: GenerateFillWithPromptInputSchema,
    outputSchema: GenerateFillWithPromptOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: [
          {media: {url: input.photoDataUri}},
          {media: {url: input.selectionDataUri}},
          {text: input.prompt}
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

    return {inpaintedPhotoDataUri: media.url!};
  }
);
