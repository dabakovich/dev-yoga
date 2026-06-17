import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * Tracks on-screen keyboard visibility. The home-indicator inset is only needed
 * while the keyboard is hidden; once it's up the keyboard covers that area, so
 * the chat input bar uses this flag to drop the extra bottom padding.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
