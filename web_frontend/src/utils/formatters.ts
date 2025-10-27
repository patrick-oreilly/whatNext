// Text formatting utilities

export const formatRoomCode = (code: string): string => {
  return code.toUpperCase();
};

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const getPlayerColor = (index: number): string => {
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-yellow-500',
  ];
  return colors[index % colors.length];
};

export const getPlayerTextColor = (index: number): string => {
  const colors = [
    'text-blue-500',
    'text-purple-500',
    'text-green-500',
    'text-yellow-500',
  ];
  return colors[index % colors.length];
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};
