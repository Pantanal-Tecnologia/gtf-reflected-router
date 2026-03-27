# Code Pattern rules

## 1. Component Structure

Todos os componentes devem seguir o padrão

```typescript
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/__mapa')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <h1>__mapa</h1>
    </div>
  )
}
```

Nunca faça algo como

```typescript

export const Route = createFileRoute('/__mapa')({
  component: RouteComponent,
})

function someFunction(data: string) {
    return data + 'f'
}

function RouteComponent() {
  return (
    <div>
      <h1>{someFunction("esse")</h1>
    </div>
  )
}

```

Sempre separe funções utilitarias dos componentes, seja o que for, nada deve ficar por fora dos componentes, nunca faça um unico grande componente,
pense na atomização e reutilização de componentes, garatindo um boa arquitetura de código

Nunca use inumeros useState para gerenciar estados

```typescript
const [deleteTarget, setDeleteTarget] = useState<RotaFavorita | null>(null)
const [isDeleting, setIsDeleting] = useState(false)
const [deleteError, setDeleteError] = useState<string | null>(null)

function handleUserDelet() {
  setIsDeleting(true)
  if (anyErrorFunction === false) setDeleteError(true)

  setIsDeleting(false)
}
```

Opte por gerenciar esses estados pelo react query

```typescript

 const userDeletMutation = useMutation({
  queryFn: async () => {
    await queryFunction()
  }
 })


 return (
  <p>state {userDeletMutation.isPending}</p>
 )

```
