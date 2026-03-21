import { notifications } from '@mantine/notifications';
import type { ReactNode } from 'react';

interface ToastOptions {
  title?: string;
  icon?: ReactNode;
}

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    notifications.show({
      message,
      color: 'green',
      title: options?.title ?? 'Success',
      icon: options?.icon,
    }),
  error: (message: string, options?: ToastOptions) =>
    notifications.show({
      message,
      color: 'red',
      title: options?.title ?? 'Error',
      icon: options?.icon,
    }),
  info: (message: string, options?: ToastOptions) =>
    notifications.show({
      message,
      color: 'blue',
      title: options?.title ?? 'Info',
      icon: options?.icon,
    }),
};
