import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import Dropdown, { DropdownOption } from './Dropdown';
import styles from './ThemeToggle.module.css';

type Theme = 'light' | 'dark' | 'system';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themeOptions: DropdownOption[] = [
    {
      value: 'light',
      label: 'Light',
      icon: <Sun className={styles.themeIcon} />,
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: <Moon className={styles.themeIcon} />,
    },
    {
      value: 'system',
      label: 'System',
      icon: <Monitor className={styles.themeIcon} />,
    },
  ];

  const getCurrentIcon = () => {
    if (theme === 'system') {
      return <Monitor className={styles.themeIcon} />;
    }
    return resolvedTheme === 'dark' ? (
      <Moon className={styles.themeIcon} />
    ) : (
      <Sun className={styles.themeIcon} />
    );
  };

  const getCurrentLabel = () => {
    if (theme === 'system') {
      return `System (${resolvedTheme})`;
    }
    return theme === 'dark' ? 'Dark' : 'Light';
  };

  return (
    <Dropdown
      options={themeOptions}
      value={theme}
      icon={getCurrentIcon()}
      onChange={value => setTheme(value as Theme)}
      className={styles.themeToggle}
    />
  );
};

export default ThemeToggle;
