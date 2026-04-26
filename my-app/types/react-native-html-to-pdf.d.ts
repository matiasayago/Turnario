declare module 'react-native-html-to-pdf' {
  export interface RNHTMLtoPDFOptions {
    html: string;
    fileName?: string;
    directory?: string;
    base64?: boolean;
    height?: number;
    width?: number;
    padding?: number;
  }

  export interface RNHTMLtoPDFResponse {
    filePath: string;
    base64?: string;
  }

  export default {
    convert(options: RNHTMLtoPDFOptions): Promise<RNHTMLtoPDFResponse>;
  };
}
