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
import { ArrowLeft, Save, MessageCircle, Instagram, Facebook, Globe, Phone, ExternalLink } from 'lucide-react';
import { StoreConfig, AfricanCountry } from '@/types';

const AdminSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    payment_details: '',
    whatsapp_number: '',
    whatsapp_message: 'Hello, I have a question about your store',
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
      
      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newData, error: insertError } = await supabase
            .from('store_config')
            .insert([{
              payment_details: '',
              whatsapp_number: '',
              whatsapp_message: 'Hello, I have a question about your store',
              instagram_link: '',
              facebook_link: '',
              selected_country: 'Nigeria',
              currency_code: 'NGN',
              currency_symbol: '₦',
            }])
            .select()
            .single();
          
          if (insertError) throw insertError;
          return newData;
        }
        
        throw error;
      }
      return data as StoreConfig;
    },
  });

  const { data: countries } = useQuery({
    queryKey: ['african-countries'],
    queryFn: async () => {
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

  useEffect(() => {
    if (storeConfig) {
      setFormData({
        payment_details: storeConfig.payment_details || '',
        whatsapp_number: storeConfig.whatsapp_number || '',
        whatsapp_message: storeConfig.whatsapp_message || 'Hello, I have a question about your store',
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
      if (!storeConfig || !storeConfig.id) {
        const { data, error } = await supabase
          .from('store_config')
          .insert([configData])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
      
      const { data, error } = await supabase
        .from('store_config')
        .update(configData)
        .eq('id', storeConfig.id)
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

  // Function to generate WhatsApp deep link with proper fallback
  const generateWhatsAppLink = () => {
    if (!formData.whatsapp_number) return null;
    
    // Clean the phone number - remove any non-digit characters except '+'
    const cleaned = formData.whatsapp_number.replace(/[^\d+]/g, '');
    
    // Ensure the number has country code (add + if missing)
    const phoneNumber = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    
    // Encode the message
    const encodedMessage = encodeURIComponent(formData.whatsapp_message);
    
    // Return both deep link and web link
    return {
      deepLink: `whatsapp://send?phone=${phoneNumber.replace('+', '')}&text=${encodedMessage}`,
      webLink: `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`,
      phoneNumber
    };
  };

  // Test the WhatsApp link with improved fallback
  const testWhatsAppLink = () => {
    const links = generateWhatsAppLink();
    
    if (!links || !links.phoneNumber) {
      toast({ 
        title: "Please enter a valid WhatsApp number first", 
        variant: "destructive" 
      });
      return;
    }

    // Create a timeout for fallback
    const fallbackTimer = setTimeout(() => {
      window.open(links.webLink, '_blank');
    }, 1000);

    // Try to open the deep link
    const link = document.createElement('a');
    link.href = links.deepLink;
    link.target = '_blank';
    
    // Add event listener to clear timeout if deep link works
    link.addEventListener('click', () => {
      clearTimeout(fallbackTimer);
    });
    
    // Also clear timeout after a short delay
    setTimeout(() => {
      clearTimeout(fallbackTimer);
    }, 500);
    
    // Trigger the click
    link.click();
  };

  // Copy WhatsApp link to clipboard (use web link as it's more reliable)
  const copyWhatsAppLink = async () => {
    const links = generateWhatsAppLink();
    
    if (!links || !links.phoneNumber) {
      toast({ 
        title: "Please enter a valid WhatsApp number first", 
        variant: "destructive" 
      });
      return;
    }
    
    try {
      await navigator.clipboard.writeText(links.webLink);
      toast({ title: "WhatsApp web link copied to clipboard!" });
    } catch (err) {
      toast({ 
        title: "Failed to copy link", 
        description: "Please copy it manually", 
        variant: "destructive" 
      });
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Loading store configuration...</p>
      </div>
    </div>
  );

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

              {/* WhatsApp Configuration */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5" />
                  <span>WhatsApp Configuration</span>
                </h3>
                <p className="text-muted-foreground text-sm">
                  Set up your WhatsApp business number for customers to contact you.
                </p>

                <div>
                  <Label htmlFor="whatsapp_number" className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>WhatsApp Number</span>
                  </Label>
                  <p className="text-muted-foreground text-xs mb-2">
                    Include country code (e.g., +2348012345678 for Nigeria)
                  </p>
                  <Input
                    id="whatsapp_number"
                    type="tel"
                    value={formData.whatsapp_number}
                    onChange={(e) => handleInputChange('whatsapp_number', e.target.value)}
                    placeholder="+2348012345678"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp_message" className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>Default Message</span>
                  </Label>
                  <p className="text-muted-foreground text-xs mb-2">
                    Pre-filled message when customers contact you
                  </p>
                  <Input
                    id="whatsapp_message"
                    value={formData.whatsapp_message}
                    onChange={(e) => handleInputChange('whatsapp_message', e.target.value)}
                    placeholder="Hello, I have a question about your store"
                    className="mt-1"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      type="button" 
                      onClick={testWhatsAppLink}
                      disabled={!formData.whatsapp_number}
                      className="flex items-center"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Test WhatsApp Link
                    </Button>
                    
                    <Button 
                      type="button" 
                      onClick={copyWhatsAppLink}
                      disabled={!formData.whatsapp_number}
                      variant="outline"
                      className="flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Copy Web Link
                    </Button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {formData.whatsapp_number ? (
                      <>The link will try to open WhatsApp app first, then fall back to web version</>
                    ) : (
                      <>Enter a WhatsApp number with country code to test the link</>
                    )}
                  </div>
                </div>
              </div>

              {/* Social Media Links */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold">Social Media Links</h3>
                <p className="text-muted-foreground text-sm">
                  Add your social media profile links. These will appear on your store for customers to follow you.
                </p>

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
                    placeholder="https://instagram.com/yourstore"
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
                    placeholder="https://facebook.com/yourstore"
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
            <CardTitle>WhatsApp Linking Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold">Important Notes:</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>WhatsApp may block direct deep linking from some browsers</li>
                <li>Always include country code (e.g., +234 for Nigeria, +27 for South Africa)</li>
                <li>On desktop, links will open web.whatsapp.com</li>
                <li>On mobile, the app will try to open first, then fall back to web</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">Format Example:</h4>
              <p className="text-muted-foreground font-mono bg-muted p-2 rounded">
                +2348012345678 (Nigeria)<br/>
                +278012345678 (South Africa)<br/>
                +254712345678 (Kenya)
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminSettings;