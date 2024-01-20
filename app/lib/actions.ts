'use server'
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import  AuthError from 'next-auth';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer',
  }),
  amount: z.coerce.number().gt(0, 'Amount must be greater than 0'),
  status: z.enum(['paid', 'pending'], { invalid_type_error: 'Please select a status' }),
  date: z.string(),
});

const CreateInvoiceSchema = FormSchema.omit({ id: true, date: true });
export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};


export async function createInvoice(preveState:State ,formData: FormData) {

  const validateFields = CreateInvoiceSchema.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  

  if (!validateFields.success) {
    return {
      errors: validateFields.error.flatten().fieldErrors,
      message: 'Missing or invalid fields. Failed to create invoice.'
    };
  }
  const { customerId, amount, status } = validateFields.data;

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`INSERT INTO invoices (customer_id, amount, status, date)
           VALUES (${customerId}, ${amountInCents}, ${status}, ${date})`;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  // const rawFormData = {
  //   customerId: formData.get('customerId'),
  //   amount: formData.get('amount'),
  //   status: formData.get('status'),
  // };

  //si son muchos campos se pueden extraer de la siguiente manera
  // const rawFormData = Object.fromEntries(formData.entries());
  // Test it out:
  // console.log(rawFormData);
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

const UpdateInvoiceSchema = FormSchema.omit({ id:true, date: true });
export async function updateInvoice(preveState:State,formData: FormData) {
  const id =formData.get('id');
   const validateFields = UpdateInvoiceSchema.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
   })
console.log('validatefields',validateFields);
    if (!validateFields.success) {
    return {
      errors: validateFields.error.flatten().fieldErrors,
      message: 'Missing or invalid fields. Failed to create invoice.'
    };
  }
  const { customerId, amount, status } = validateFields.data;
    
  // const { customerId, amount, status } = UpdateInvoiceSchema.parse(
  //   Object.fromEntries(formData.entries()),
  // );
  // console.log(status);
  const amountInCents = amount * 100;
    try {
      
      await sql`UPDATE invoices
              SET customer_id = ${customerId},
                  amount = ${amountInCents},
                  status = ${status}
              WHERE id = ${String(id)}`;
    } catch (error) {
      return {
        message: 'Database Error: Failed to Update Invoice.',
      };
    }
  revalidatePath(`/dashboard/invoices/`);
 
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  // throw new Error('Failed to delete Invoice');
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
    return {message: 'Invoice Deleted'};
  } catch (error) {
    return {message: 'Database Error: Failed to Delete Invoice.'};
  }
  
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
   
    //  await signIn('credentials', formData);
    const res = await signIn("credentials",{
      email: formData.get('email'),
      password: formData.get('password'),
    })  
    
    console.log('res',res);
  } catch (error) {
    console.log('error',error)
    // if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    // }
    throw error;
  }
}



 
