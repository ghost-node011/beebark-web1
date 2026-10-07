import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { API_URL } from '../../../config/api';

/**
 * "Request a quote" for someone who isn't connected to the business yet.
 * The business gets a notification and an email; connected buyers chat instead.
 */
const QuoteDialog = ({ open, onOpenChange, username, ownerName, item }) => {
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuantity('');
    setMessage(item
      ? `Hi, I'd like a quote for ${item.title}${item.sku ? ` (SKU ${item.sku})` : ''}. Please share price, availability and delivery time.`
      : `Hi, I came across your catalogue on BeeBark and would like to know more.`);
  }, [open, item]);

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API_URL}/api/portfolio/${encodeURIComponent(username)}/enquiry`, {
        itemId: item?._id,
        quantity: quantity.trim(),
        message: message.trim()
      });
      toast.success(`Sent. ${ownerName || 'They'} will get back to you.`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not send your request');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md rounded-2xl" data-testid="quote-dialog">
        <DialogHeader>
          <DialogTitle>{item ? 'Request a quote' : `Contact ${ownerName || 'this business'}`}</DialogTitle>
          <DialogDescription>
            {item ? `${item.title}${item.sku ? ` · SKU ${item.sku}` : ''}` : 'Your message goes to them by email and on BeeBark.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {item && (
            <div className="space-y-1.5">
              <Label htmlFor="quote-qty">Quantity</Label>
              <Input id="quote-qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} maxLength={120}
                placeholder={item.moq ? `Minimum order: ${item.moq}` : 'e.g. 1,200 sq ft or 50 bags'} data-testid="quote-quantity" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="quote-message">Message</Label>
            <Textarea id="quote-message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={5} data-testid="quote-message" />
          </div>
          <p className="text-xs text-gray-500">They'll see your name and profile, and can reply by email or connect with you.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={sending || !message.trim()} className="bg-black text-white hover:bg-gray-800" data-testid="quote-send">
              {sending ? 'Sending…' : 'Send request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteDialog;
