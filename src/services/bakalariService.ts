import axios from 'axios';
import { API_BASE_PATH } from '../lib/constants';

const proxyAxios = axios.create({
  baseURL: '/api-proxy',
});

// Interceptor to add auth token
proxyAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('bakalari_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const stripHtml = (value?: string) => {
  if (!value) return '';

  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const postForm = async (url: string) => {
  return proxyAxios.post(url, '', {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
  });
};

const postJson = async (url: string, data: any) => {
  return proxyAxios.post(url, data, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json',
    },
  });
};

export const bakalariService = {
  async login(username: string, password: string) {
    const params = new URLSearchParams();
    params.append('client_id', 'ANDR');
    params.append('grant_type', 'password');
    params.append('username', username);
    params.append('password', password);

    const response = await proxyAxios.post('/api/login', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
    });
    return response.data;
  },

  async getDashboard() {
    try {
      const response = await proxyAxios.get(`${API_BASE_PATH}/dashboard`);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      return null;
    }
  },

  async getTimetable(type: string = 'actual', date?: string) {
    try {
      const url = date
        ? `${API_BASE_PATH}/timetable/${type}?date=${date}`
        : `${API_BASE_PATH}/timetable/${type}`;
      const response = await proxyAxios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching timetable:', error);
      return null;
    }
  },

  async getMarks() {
    try {
      const response = await proxyAxios.get(`${API_BASE_PATH}/marks`);
      return response.data;
    } catch (error) {
      console.error('Error fetching marks:', error);
      return null;
    }
  },

  async getHomeworks() {
    try {
      const response = await proxyAxios.get(`${API_BASE_PATH}/homeworks`);
      return response.data;
    } catch (error) {
      console.error('Error fetching homeworks:', error);
      return null;
    }
  },

  async getMessages(folder: string = 'received') {
    try {
      const response = await proxyAxios.get(`${API_BASE_PATH}/messages/${folder}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return null;
    }
  },

  async getReceivedMessages() {
    try {
      const response = await postForm('/api/3/komens/messages/received');
      const messages = response.data?.Messages || [];

      return messages.map((message: any) => ({
        Id: message.Id,
        DateSent: message.SentDate,
        Sender: message.Sender
          ? {
              Id: message.Sender.Id,
              Name: message.Sender.Name,
              Type: message.Sender.Type,
            }
          : undefined,
        Title: message.Title || '',
        Content: stripHtml(message.Text),
        IsRead: Boolean(message.Read),
        MessageType: message.Type,
        CanAnswer: message.CanAnswer,
        CanConfirm: message.CanConfirm,
        Attachments: message.Attachments || [],
      }));
    } catch (error) {
      console.error('Error fetching received messages:', error);
      return [];
    }
  },

  async getSentMessages() {
    try {
      const response = await postForm('/api/3/komens/messages/sent');
      const messages = response.data?.Messages || [];

      return messages.map((message: any) => ({
        Id: message.Id,
        DateSent: message.SentDate,
        Recipient: {
          Id: message.RelevantName || message.Recipient?.Id || message.Recipients?.[0]?.RecipientId || '',
          Name: message.RelevantName || message.Recipient?.Name || message.Recipients?.[0]?.DisplayName || message.Recipients?.[0]?.Name || '',
        },
        Title: message.Title || '',
        Content: stripHtml(message.Text),
        IsRead: true,
        MessageType: message.Type,
        Attachments: message.Attachments || [],
      }));
    } catch (error) {
      console.error('Error fetching sent messages:', error);
      return [];
    }
  },

  async getMessageDetail(folder: 'received' | 'sent', id: string) {
    try {
      const response = await proxyAxios.get(`/api/3/komens/messages/${folder}/${encodeURIComponent(id)}`);
      return response.data?.Message || response.data || null;
    } catch (error) {
      console.error('Error fetching message detail:', error);
      return null;
    }
  },

  async markMessageAsRead(id: string) {
    try {
      await proxyAxios.put(`/api/3/komens/message/${encodeURIComponent(id)}/mark-as-read`);
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  },

  async sendMessage(payload: any) {
    try {
      const response = await postJson('/api/3/komens/message', payload);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  async getMessageTypes() {
    try {
      const response = await proxyAxios.get('/api/3/komens/message-types');
      return response.data || null;
    } catch (error) {
      console.error('Error fetching message types:', error);
      return null;
    }
  },

  async getUserInfo() {
    try {
      const response = await proxyAxios.get(`${API_BASE_PATH}/user`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  },

  async getSubjects() {
    try {
      const response = await proxyAxios.get(`${API_BASE_PATH}/subjects`);
      return response.data;
    } catch (error) {
      console.error('Error fetching subjects:', error);
      return null;
    }
  },

  async getTeachers() {
    try {
      const response = await proxyAxios.get(`${API_BASE_PATH}/teachers`);
      return response.data;
    } catch (error) {
      console.error('Error fetching teachers:', error);
      return null;
    }
  },

  async getAverageMark() {
    try {
      const response = await proxyAxios.get(`${API_BASE_PATH}/marks`);
      if (response.data?.Subjects) {
        let totalMarks = 0;
        let markCount = 0;
        response.data.Subjects.forEach((subject: any) => {
          if (subject.Marks && Array.isArray(subject.Marks)) {
            subject.Marks.forEach((mark: any) => {
              if (mark.MarkText && !isNaN(mark.MarkText) && mark.MarkText !== 'N' && mark.MarkText !== 'A' && mark.MarkText !== 'X' && mark.MarkText !== 'U') {
                totalMarks += parseFloat(mark.MarkText);
                markCount++;
              }
            });
          }
        });
        if (markCount === 0) return 0;
        const avg = totalMarks / markCount;
        return parseFloat(avg.toFixed(2));
      }
      return 0;
    } catch (error) {
      console.error('Error calculating average mark:', error);
      return 0;
    }
  },

  async getAbsences() {
    try {
      const response = await proxyAxios.get('/api/3/absence/student');
      return response.data || null;
    } catch (error) {
      console.error('Error fetching absences:', error);
      return null;
    }
  },

  async getEvents() {
    try {
      const response = await proxyAxios.get(`${API_BASE_PATH}/events`);
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error);
      return null;
    }
  },

  async getAnnouncements() {
    try {
      const response = await postForm('/api/3/komens/messages/noticeboard');
      const messages = response.data?.Messages || [];

      return {
        Komens: messages.map((message: any) => ({
          Id: message.Id,
          Title: message.Title || '',
          Content: stripHtml(message.Text),
          DateCreated: message.SentDate,
          IsRead: Boolean(message.Read),
          Priority: message.Type === 'OMLUVENKA' ? 1 : 2,
          Expiration: message.DateTo,
        })),
      };
    } catch (error) {
      console.error('Error fetching announcements:', error);
      return null;
    }
  },

  async getAllSubjects() {
    try {
      const response = await proxyAxios.get(`${API_BASE_PATH}/marks`);
      if (response.data?.Subjects) {
        return response.data.Subjects.map((s: any) => ({
          id: s.Subject.Id,
          name: s.Subject.Name,
          abbrev: s.Subject.Abbrev,
          averageText: s.AverageText,
          marks: s.Marks || []
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching subjects:', error);
      return [];
    }
  },
};
