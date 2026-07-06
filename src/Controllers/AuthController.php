<?php

declare(strict_types=1);

namespace ProLab\Controllers;

use PDOException;
use ProLab\Core\Auth;
use ProLab\Core\Request;
use ProLab\Core\Response;
use ProLab\Repositories\UserRepository;

final class AuthController
{
    private const PASSWORD_MIN = 8;

    public static function register(Request $request): never
    {
        $name = trim((string) $request->input('name', ''));
        $email = mb_strtolower(trim((string) $request->input('email', '')));
        $password = (string) $request->input('password', '');

        if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
            Response::error('O nome deve ter entre 2 e 100 caracteres.', 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('E-mail inválido.', 422);
        }

        if (mb_strlen($password) < self::PASSWORD_MIN) {
            Response::error(
                sprintf('A palavra-passe deve ter pelo menos %d caracteres.', self::PASSWORD_MIN),
                422
            );
        }

        if (UserRepository::findByEmail($email) !== null) {
            Response::error('Este e-mail já está registado.', 409);
        }

        try {
            $id = UserRepository::create($name, $email, password_hash($password, PASSWORD_DEFAULT));
        } catch (PDOException $e) {
            // Corrida entre a verificação e o INSERT: e-mail duplicado.
            if (in_array($e->getCode(), ['23000', '23505'], true)) {
                Response::error('Este e-mail já está registado.', 409);
            }

            throw $e;
        }

        Auth::login($id);

        Response::json([
            'success' => true,
            'message' => 'Conta criada com sucesso.',
            'user' => ['id' => $id, 'name' => $name, 'email' => $email],
        ], 201);
    }

    public static function login(Request $request): never
    {
        $email = mb_strtolower(trim((string) $request->input('email', '')));
        $password = (string) $request->input('password', '');

        if ($email === '' || $password === '') {
            Response::error('E-mail e palavra-passe são obrigatórios.', 422);
        }

        $user = UserRepository::findByEmail($email);

        if ($user === null || !password_verify($password, $user['password_hash'])) {
            // Atraso aleatório: dificulta enumeração de contas por tempo de resposta.
            usleep(random_int(120_000, 320_000));
            Response::error('E-mail ou palavra-passe incorretos.', 401);
        }

        // Mantém hashes atualizados quando o algoritmo default do PHP evolui.
        if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
            UserRepository::updatePasswordHash($user['id'], password_hash($password, PASSWORD_DEFAULT));
        }

        Auth::login($user['id']);

        Response::json([
            'success' => true,
            'user' => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email']],
        ]);
    }

    public static function logout(Request $request): never
    {
        Auth::logout();

        Response::json(['success' => true, 'message' => 'Sessão terminada.']);
    }

    public static function session(Request $request): never
    {
        $id = Auth::id();

        if ($id === null) {
            Response::json(['success' => true, 'authenticated' => false, 'user' => null]);
        }

        $user = UserRepository::findById($id);

        if ($user === null) {
            Auth::logout();
            Response::json(['success' => true, 'authenticated' => false, 'user' => null]);
        }

        Response::json([
            'success' => true,
            'authenticated' => true,
            'user' => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email']],
        ]);
    }
}
