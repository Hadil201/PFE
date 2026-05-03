import { google } from 'googleapis';
import { Readable } from 'stream';

export interface GoogleDriveFile {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink: string;
  size: string;
  mimeType: string;
}

export class GoogleDriveService {
  private drive: any;
  private folderId: string;

  constructor() {
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
    
    const auth = new google.auth.GoogleAuth({
      keyFile: 'path-to-service-account-key.json', // You'll need to set this up
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  async uploadFile(
    fileName: string,
    mimeType: string,
    buffer: Buffer | Readable
  ): Promise<GoogleDriveFile> {
    try {
      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: mimeType,
          parents: this.folderId ? [this.folderId] : undefined,
        },
        media: {
          mimeType: mimeType,
          body: buffer,
        },
      });

      if (!response.data.id) {
        throw new Error('Failed to upload file to Google Drive');
      }

      // Make the file publicly accessible
      await this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      return {
        id: response.data.id,
        name: response.data.name || fileName,
        webViewLink: response.data.webViewLink || '',
        webContentLink: response.data.webContentLink || '',
        size: response.data.size || '0',
        mimeType: response.data.mimeType || mimeType,
      };
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      throw error;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({
        fileId: fileId,
      });
    } catch (error) {
      console.error('Error deleting from Google Drive:', error);
      throw error;
    }
  }

  async getFileInfo(fileId: string): Promise<GoogleDriveFile | null> {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,webViewLink,webContentLink,size,mimeType',
      });

      if (!response.data) {
        return null;
      }

      return {
        id: response.data.id || fileId,
        name: response.data.name || '',
        webViewLink: response.data.webViewLink || '',
        webContentLink: response.data.webContentLink || '',
        size: response.data.size || '0',
        mimeType: response.data.mimeType || '',
      };
    } catch (error) {
      console.error('Error getting file info from Google Drive:', error);
      return null;
    }
  }

  async listFiles(folderId?: string): Promise<GoogleDriveFile[]> {
    try {
      const query = folderId 
        ? `'${folderId}' in parents and trashed=false`
        : 'trashed=false';

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id,name,webViewLink,webContentLink,size,mimeType)',
      });

      return (response.data.files || []).map((file: any) => ({
        id: file.id || '',
        name: file.name || '',
        webViewLink: file.webViewLink || '',
        webContentLink: file.webContentLink || '',
        size: file.size || '0',
        mimeType: file.mimeType || '',
      }));
    } catch (error) {
      console.error('Error listing files from Google Drive:', error);
      return [];
    }
  }
}

export const googleDriveService = new GoogleDriveService();
