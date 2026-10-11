import { Button, Group, NumberInput, Select, Stack, Textarea, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { zod4Resolver } from 'mantine-form-zod-resolver'
import { useMemo, useState } from 'react'

import { createProductFormSchema } from '../../schemas/adminProduct.ts'
import type { ProductFormValues, ProductInput } from '../../schemas/adminProduct.ts'
import type { CategoryOption } from '../../types/product.ts'

const EMPTY_VALUES: ProductFormValues = { title: '', description: '', category: '', price: '', stock: '' }

interface ProductFormProps {
  categories: readonly CategoryOption[]
  initialValues?: ProductInput
  submitLabel: string
  /** Deve rejeitar em caso de falha, para o formulário voltar a aceitar envios. */
  onSubmit: (product: ProductInput) => Promise<void>
  onCancel: () => void
}

/** Formulário de produto reutilizado no cadastro e na edição. */
export function ProductForm({ categories, initialValues, submitLabel, onSubmit, onCancel }: ProductFormProps) {
  // As categorias já estão carregadas quando o formulário é montado; o schema é criado uma vez.
  const schema = useMemo(() => createProductFormSchema(categories.map((option) => option.value)), [categories])

  const form = useForm<ProductFormValues, ProductInput>({
    initialValues: initialValues ?? EMPTY_VALUES,
    validate: zod4Resolver(schema),
    // Após a validação, o schema converte e normaliza os valores (números, textos sem espaços extras).
    transformValues: (values) => schema.parse(values),
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Envios duplicados: o clique é um evento discreto, então o React aplica `isSubmitting`
  // (botão em loading/desabilitado) antes de processar o próximo clique.
  async function handleSubmit(product: ProductInput) {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      await onSubmit(product)
    } catch {
      // A página exibe o erro; o formulário volta a aceitar envios.
    }
    setIsSubmitting(false)
  }

  return (
    <form
      noValidate
      onSubmit={form.onSubmit((product) => {
        void handleSubmit(product)
      })}
    >
      <Stack gap="md">
        <TextInput
          label="Nome do produto"
          withAsterisk
          disabled={isSubmitting}
          key={form.key('title')}
          {...form.getInputProps('title')}
        />
        <Textarea
          label="Descrição"
          withAsterisk
          autosize
          minRows={3}
          maxRows={8}
          disabled={isSubmitting}
          key={form.key('description')}
          {...form.getInputProps('description')}
        />
        <Select
          label="Categoria"
          withAsterisk
          placeholder="Selecione uma categoria"
          data={categories}
          searchable
          nothingFoundMessage="Nenhuma categoria encontrada"
          disabled={isSubmitting}
          key={form.key('category')}
          {...form.getInputProps('category')}
        />
        <Group grow align="flex-start" preventGrowOverflow={false}>
          <NumberInput
            label="Preço (R$)"
            withAsterisk
            min={0}
            decimalScale={2}
            decimalSeparator=","
            thousandSeparator="."
            disabled={isSubmitting}
            key={form.key('price')}
            {...form.getInputProps('price')}
          />
          <NumberInput
            label="Estoque"
            withAsterisk
            min={0}
            allowDecimal={false}
            disabled={isSubmitting}
            key={form.key('stock')}
            {...form.getInputProps('stock')}
          />
        </Group>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
