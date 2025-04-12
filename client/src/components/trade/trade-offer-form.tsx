import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DirectTradeButton } from "./direct-trade-button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// The form schema
const formSchema = z.object({
  offerItemName: z.string().min(1, "Item name is required"),
  offerItemDescription: z.string().min(1, "Item description is required"),
  offerValue: z.number().min(1000, "Value must be at least 1,000 VND"),
});

type FormValues = z.infer<typeof formSchema>;

interface TradeOfferFormProps {
  productId: number;
  sellerId: number;
  productTitle: string;
  onSuccess?: () => void;
}

export function TradeOfferForm({ productId, sellerId, productTitle, onSuccess }: TradeOfferFormProps) {
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [formData, setFormData] = useState<FormValues | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      offerItemName: "",
      offerItemDescription: "",
      offerValue: 10000,
    },
  });
  
  const onSubmit = (data: FormValues) => {
    setFormData(data);
    setStep("confirm");
  };
  
  if (step === "confirm" && formData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Confirm Trade Offer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Your Item</h3>
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium">{formData.offerItemName}</p>
                <p className="text-sm text-muted-foreground">{formData.offerItemDescription}</p>
                <p className="text-sm font-medium text-primary mt-1">
                  {(formData.offerValue / 1000).toFixed(3)} ₫
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Product You Want</h3>
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium">{productTitle}</p>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>📝 Note: A 10% platform fee will be applied to the trade.</p>
            <p>💰 You and the seller must both confirm the trade to complete it.</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setStep("form")}>Go Back</Button>
          <DirectTradeButton
            productId={productId}
            sellerId={sellerId}
            offerValue={formData.offerValue}
            offerItemName={formData.offerItemName}
            offerItemDescription={formData.offerItemDescription}
            onSuccess={() => {
              form.reset();
              setStep("form");
              setFormData(null);
              if (onSuccess) onSuccess();
            }}
          />
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Make Trade Offer</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="offerItemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="TV, Phone, Laptop, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="offerItemDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your item's condition, features, etc."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="offerValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Value (VND)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={1000}
                      step={1000}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full">
              Review Offer
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}