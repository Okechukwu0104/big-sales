import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, MessageCircle, Instagram, Facebook, Globe } from 'lucide-react';
import { StoreConfig, AfricanCountry } from '@/types';

const AdminSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    payment_details: '',
    whatsapp_link: '',
    instagram_link: '',
    facebook_link: '',
    selected_country: 'Nigeria',
    currency_code: 'NGN',
    currency_symbol: '₦',
  });

  const { data: storeConfig, isLoading } = useQuery({
    queryKey: ['store-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_config')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as StoreConfig;
    },
  });

  const { data: countries } = useQuery({
    queryKey: ['african-countries'],
    queryFn: async () => {
      // Hardcoded data to avoid Supabase type issues
      const africanCountries: AfricanCountry[] = [
        { id: '1', name: 'Nigeria', currency_code: 'NGN', currency_symbol: '₦', created_at: '' },
        { id: '2', name: 'South Africa', currency_code: 'ZAR', currency_symbol: 'R', created_at: '' },
        { id: '3', name: 'Kenya', currency_code: 'KES', currency_symbol: 'KSh', created_at: '' },
        { id: '4', name: 'Ghana', currency_code: 'GHS', currency_symbol: '₵', created_at: '' },
        { id: '5', name: 'Egypt', currency_code: 'EGP', currency_symbol: '£E', created_at: '' },
        { id: '6', name: 'Morocco', currency_code: 'MAD', currency_symbol: 'DH', created_at: '' },
        { id: '7', name: 'Tanzania', currency_code: 'TZS', currency_symbol: 'TSh', created_at: '' },
        { id: '8', name: 'Uganda', currency_code: 'UGX', currency_symbol: 'USh', created_at: '' },
        { id: '9', name: 'Ethiopia', currency_code: 'ETB', currency_symbol: 'Br', created_at: '' },
        { id: '10', name: 'Zimbabwe', currency_code: 'ZWL', currency_symbol: 'Z$', created_at: '' },
      ];
      return africanCountries;
    },
  });

  // Update form data when store config loads
  useEffect(() => {
    if (storeConfig) {
      setFormData({
        payment_details: storeConfig.payment_details || '',
        whatsapp_link: storeConfig.whatsapp_link || '',
        instagram_link: storeConfig.instagram_link || '',
        facebook_link: storeConfig.facebook_link || '',
        selected_country: storeConfig.selected_country || 'Nigeria',
        currency_code: storeConfig.currency_code || 'NGN',
        currency_symbol: storeConfig.currency_symbol || '₦',
      });
    }
  }, [storeConfig]);

  const updateConfigMutation = useMutation({
    mutationFn: async (configData: typeof formData) => {
      const { data, error } = await supabase
        .from('store_config')
        .update(configData)
        .eq('id', storeConfig!.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-config'] });
      toast({ title: "Store settings updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating settings", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfigMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCountryChange = (countryName: string) => {
    const selectedCountry = countries?.find(c => c.name === countryName);
    if (selectedCountry) {
      setFormData(prev => ({
        ...prev,
        selected_country: selectedCountry.name,
        currency_code: selectedCountry.currency_code,
        currency_symbol: selectedCountry.currency_symbol,
      }));
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/admin" className="flex items-center text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-primary">Store Settings</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Store Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Country and Currency Selection */}
              <div>
                <Label htmlFor="selected_country" className="text-base font-semibold flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>Country & Currency</span>
                </Label>
                <p className="text-muted-foreground text-sm mb-2">
                  Select your country to automatically set the appropriate currency for your store.
                </p>
                <Select value={formData.selected_country} onValueChange={handleCountryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries?.map((country) => (
                      <SelectItem key={country.id} value={country.name}>
                        {country.name} ({country.currency_symbol} {country.currency_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>Selected Currency:</strong> {formData.currency_symbol} {formData.currency_code}
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <Label htmlFor="payment_details" className="text-base font-semibold">
                  Payment Details
                </Label>
                <p className="text-muted-foreground text-sm mb-2">
                  Enter your bank account details, mobile money numbers, or other payment information. 
                  This will be displayed to customers during checkout.
                </p>
                <Textarea
                  id="payment_details"
                  value={formData.payment_details}
                  onChange={(e) => handleInputChange('payment_details', e.target.value)}
                  placeholder="Bank Name: XYZ Bank&#10;Account Number: 1234567890&#10;Account Name: BIG SALES&#10;Mobile Money: +1234567890"
                  rows={5}
                  className="resize-none"
                />
              </div>

              {/* Social Media Links */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold">Social Media Links</h3>
                <p className="text-muted-foreground text-sm">
                  Add your social media contact links. These will appear on your store for customers to reach you.
                </p>

                <div>
                  <Label htmlFor="whatsapp_link" className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>WhatsApp Link</span>
                  </Label>
                  <Input
                    id="whatsapp_link"
                    type="url"
                    value={formData.whatsapp_link}
                    onChange={(e) => handleInputChange('whatsapp_link', e.target.value)}
                    placeholder="https://wa.me/1234567890"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="instagram_link" className="flex items-center space-x-2">
                    <Instagram className="h-4 w-4" />
                    <span>Instagram Link</span>
                  </Label>
                  <Input
                    id="instagram_link"
                    type="url"
                    value={formData.instagram_link}
                    onChange={(e) => handleInputChange('instagram_link', e.target.value)}
                    placeholder="https://instagram.com/bigsales"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="facebook_link" className="flex items-center space-x-2">
                    <Facebook className="h-4 w-4" />
                    <span>Facebook Link</span>
                  </Label>
                  <Input
                    id="facebook_link"
                    type="url"
                    value={formData.facebook_link}
                    onChange={(e) => handleInputChange('facebook_link', e.target.value)}
                    placeholder="https://facebook.com/bigsales"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={updateConfigMutation.isPending}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateConfigMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Start Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold">Payment Details:</h4>
              <p className="text-muted-foreground">
                Add your bank account, mobile money, or other payment details. 
                Customers will see this information when they place an order.
              </p>
            </div>
            <div>
              <h4 className="font-semibold">WhatsApp Link:</h4>
              <p className="text-muted-foreground">
                Create a WhatsApp link like: https://wa.me/1234567890 
                (replace with your phone number including country code)
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Social Media:</h4>
              <p className="text-muted-foreground">
                Add your Instagram and Facebook profile or page URLs to help customers contact you.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminSettings;