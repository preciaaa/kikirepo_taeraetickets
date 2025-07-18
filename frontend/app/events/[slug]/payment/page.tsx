'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function PaymentPage() {
    const params = useSearchParams()
    const category = params.get('category'),
          quantity = params.get('quantity'),
          price = params.get('price')
    
    return(
        <div>
        <h1 className="text-2xl font-bold mb-4">Payment Page</h1>
        <p>Category: {category}</p>
        <p>Quantity: {quantity}</p>
        <p>Price: ${price}</p>
         <Button>
             Pay
         </Button>
     </div>
    )
}