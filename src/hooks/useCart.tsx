import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return []; // */
  });

  const getStock = async (productId: number) => {
    const { data: stock } = await api.get<Stock>(`/stock/${productId}`)

    if (!stock) {
      throw new Error()
    }

    return stock
  }

  const getProduct = async (productId: number) => {
    const { data: product } = await api.get<Product>(`/products/${productId}`)

    if (!product) {
      throw new Error()
    }

    return product
  }

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyExists = cart.find(product => product.id === productId)

      if (productAlreadyExists) {
        await updateProductAmount({
          productId,
          amount: productAlreadyExists.amount + 1
        })
      } else {
        const stock = await getStock(productId)

        if (stock.amount === 0) {
          toast.error("Quantidade solicitada fora de estoque");
          return
        }

        const product = await getProduct(productId)
        const newProduct = {
          ...product,
          amount: 1
        }

        const newCart = [...cart, newProduct]

        setCart(newCart)
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.find(product => product.id === productId)) throw new Error()

      const updatedCart = cart.filter(product => !(product.id === productId))

      setCart(updatedCart)
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) throw new Error()

      const newCart = [...cart]
      const product = newCart.find(product => product.id === productId)
      if (!product) throw new Error()


      const stock = await getStock(productId)

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      product.amount = amount

      setCart(newCart)
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
