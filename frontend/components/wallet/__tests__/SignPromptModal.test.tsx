import { fireEvent, render, screen } from '@testing-library/react';
import { SignPromptModal } from '../SignPromptModal';

test('guides signing in an accessible dialog and allows hiding instructions', () => {
  const onClose = jest.fn();
  render(<SignPromptModal open onClose={onClose} />);
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Sign transaction in Freighter');
  expect(screen.getByText(/review the transaction details and XLM fee/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Hide instructions' }));
  expect(onClose).toHaveBeenCalled();
});
