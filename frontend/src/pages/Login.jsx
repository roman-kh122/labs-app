import { TextInput, PasswordInput, Checkbox, Anchor, Paper, Title, Text, Container, Group, Button } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Некоректний email'),
    },
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      notifications.show({
        title: 'Успіх',
        message: 'Успішний вхід',
        color: 'teal',
      });
      navigate('/');
    } catch (error) {
      notifications.show({
        title: 'Помилка',
        message: error.response?.data?.error || 'Помилка входу',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={80}>
      <Title ta="center" className="mantine-Title-root" style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)', fontWeight: 900 }}>
        З поверненням!
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Ще не маєте акаунту?{' '}
        <Anchor size="sm" component={Link} to="/register">
          Створити акаунт
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Email"
            placeholder="you@mantine.dev"
            required
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Пароль"
            placeholder="Ваш пароль"
            required
            mt="md"
            {...form.getInputProps('password')}
          />
          <Group justify="space-between" mt="lg">
            <Checkbox label="Запам'ятати мене" />
            <Anchor component="button" size="sm" type="button">
              Забули пароль?
            </Anchor>
          </Group>
          <Button fullWidth mt="xl" type="submit" loading={loading} color="teal">
            Увійти
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
