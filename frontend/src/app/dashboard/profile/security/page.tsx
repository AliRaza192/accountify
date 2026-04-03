'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Shield, Key, Mail } from 'lucide-react';
import axios from 'axios';

export default function SecurityPage() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleSendOTP = async () => {
    try {
      await axios.post('/api/auth/2fa/send-otp', { user_id: 'current-user-id' });
      toast.success('OTP sent to your email');
      setVerifying(true);
    } catch (error) {
      toast.error('Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    try {
      await axios.post('/api/auth/2fa/verify-otp', { 
        user_id: 'current-user-id', 
        otp 
      });
      toast.success('2FA enabled successfully');
      setTwoFactorEnabled(true);
      setVerifying(false);
      setOtp('');
    } catch (error) {
      toast.error('Invalid OTP');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Security Settings</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>Add an extra layer of security to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                <div>
                  <p className="font-medium">Email 2FA</p>
                  <p className="text-sm text-muted-foreground">
                    Receive a 6-digit code via email when logging in
                  </p>
                </div>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={setTwoFactorEnabled}
              />
            </div>

            {twoFactorEnabled && !verifying && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800">✓ Two-factor authentication is enabled</p>
              </div>
            )}

            {!twoFactorEnabled && (
              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button onClick={handleSendOTP}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Verification Code
                </Button>

                {verifying && (
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter 6-digit Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="otp"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-32"
                      />
                      <Button onClick={handleVerifyOTP}>Verify</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
