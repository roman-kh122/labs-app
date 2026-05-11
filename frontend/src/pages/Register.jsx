import { TextInput, PasswordInput, Paper, Title, Text, Container, Button, Anchor } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Некоректний email'),
      password: (value) => (value.length < 6 ? 'Пароль має містити щонайменше 6 символів' : null),
    },
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await register(values.name, values.email, values.password);
      notifications.show({
        title: 'Успіх',
        message: 'Акаунт успішно створено',
        color: 'teal',
      });
      navigate('/');
    } catch (error) {
      notifications.show({
        title: 'Помилка',
        message: error.response?.data?.error || 'Помилка реєстрації',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={80}>
      <Title ta="center" className="mantine-Title-root" style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)', fontWeight: 900 }}>
        Створити акаунт
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Вже маєте акаунт?{' '}
        <Anchor size="sm" component={Link} to="/login">
          Увійти
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Ім'я"
            placeholder="Ваше ім'я"
            required
            {...form.getInputProps('name')}
          />
          <TextInput
            label="Email"
            placeholder="you@mantine.dev"
            required
            mt="md"
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Пароль"
            placeholder="Ваш пароль"
            required
            mt="md"
            {...form.getInputProps('password')}
          />
          
          <Button fullWidth mt="xl" type="submit" loading={loading} color="teal">
            Зареєструватись
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
