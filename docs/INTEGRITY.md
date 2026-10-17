# Integridade / Integrity

## Português brasileiro

O pacote fonte é `crow-studio-0.2.0.zupt`, em formato Zupt genuíno, público e sem
criptografia. Use os arquivos da release do
[Security Ops](https://git.securityops.co/cristiancmoises/crow-studio/releases),
[Security Ops Brasil](https://git.securityops.com.br/cristiancmoises/crow-studio/releases)
ou [Codeberg](https://codeberg.org/berkeley/crow-studio/releases). Downloads fonte
gerados automaticamente pelo forge são diferentes do pacote `.zupt` publicado.

Os artefatos de verificação são `SHA256SUMS`, `SHA256SUMS.asc`, `INTEGRITY.json`
e `INTEGRITY.json.asc`. O registro de integridade identifica o commit, a árvore,
o hash do manifesto CodeMark, os dois fingerprints públicos e o checkpoint da
atestação. Confira o fingerprint GPG por um canal independente antes de confiar
na chave importada:

```text
0CFA 43B9 AA96 42EA AF2B E983 C4C6 61C9 ECFB 46E8
```

Depois de obter a chave pública correta e os arquivos da mesma release:

```sh
gpg --verify SHA256SUMS.asc SHA256SUMS
gpg --verify INTEGRITY.json.asc INTEGRITY.json
sha256sum -c SHA256SUMS
zupt test crow-studio-0.2.0.zupt
zupt extract -o restored crow-studio-0.2.0.zupt
```

Verifique também a tag anotada no clone do fonte:

```sh
git fetch --tags
git verify-tag v0.2.0
git verify-commit 'v0.2.0^{commit}'
git rev-parse 'v0.2.0^{tree}'
```

Compare commit e árvore com o registro autenticado. Uma tag e uma release são
objetos diferentes; verifique ambas no destino utilizado.

### Permissões POSIX após extrair

Zupt 5.2.10 preserva os bytes, mas não os modos POSIX. CodeMark registra modos e
também os verifica. Após autenticar o arquivo `.zupt` pelos checksums GPG, restaure
somente os modos regulares 0644/0755 do manifesto já autenticado. Não gere outro
snapshot para ocultar a diferença da extração. O trecho abaixo funciona na raiz
que contém a pasta `restored/`:

```sh
python3 - <<'PY'
import json
from pathlib import Path
root = Path('restored/crow-studio-0.2.0').resolve()
manifest = json.loads((root / '.codemark/integrity.json').read_text())
entries = []
for relative, record in manifest['files'].items():
    path = root / relative
    if path.is_symlink() or not path.resolve().is_relative_to(root):
        raise SystemExit('Invalid release path')
    mode = record['mode']
    if not path.is_file() or mode not in (0o644, 0o755):
        raise SystemExit('Unexpected release file or mode')
    entries.append((path, mode))
for path, mode in entries:
    path.chmod(mode)
PY
```

Os bytes continuam sujeitos à verificação completa a seguir. Scripts também
podem ser iniciados explicitamente com `sh scripts/start.sh`.

### Atestação CodeMark

O fonte contém `.codemark/integrity.json` e `.codemark/attestations.json`.
A atestação combina **ML-DSA-87 e Ed25519**, autenticando o manifesto integral;
os arquivos não recebem marcas ou comentários. A cobertura é de todos os
arquivos regulares do staging, exceto metadados `.codemark` e diretórios de
controle de versão. `.env`, dependências e logs não são excluídos pelo mecanismo;
eles precisam estar ausentes do staging da release.

Use CodeMark **0.4.1**. O executável utilizado na preparação tem SHA-256:

```text
a4b4e76dcda43a4631a16283afe26ca5814cd8c2246ca1172ca6a16afeafafc7
```

Leia os fingerprints e o checkpoint do `INTEGRITY.json` cuja assinatura GPG foi
validada. Mantenha-os fora da árvore a verificar. Substitua os valores abaixo:

```sh
python3 /caminho/codemark.pyz audit restored/crow-studio-0.2.0 \
  --pq-fingerprint FINGERPRINT_MLDSA87 \
  --classical-fingerprint FINGERPRINT_ED25519 \
  --checkpoint CHECKPOINT_SHA512 \
  --json
```

Os dois pins e o checkpoint são necessários para conferir identidade das chaves
e detectar regressão da cadeia. Valores encontrados apenas dentro da própria
árvore não estabelecem confiança. O verificador precisa de OpenSSL 3.5 ou
superior com ML-DSA-87 e Ed25519. A verificação compara conteúdo e modos ao
manifesto assinado; não mede qualidade do software nem fornece tempo confiável.
`audit` usa a assinatura híbrida. A opção `--require-signature` pertence ao
modo legado de assinatura de fontes e não deve ser combinada com esses pins.

## English

Use `codemark audit` with both independently trusted fingerprints and the
checkpoint, as shown above. `--require-signature` belongs to the legacy source
signature mode and must not be combined with these hybrid pins.

The public, unencrypted source package is `crow-studio-0.2.0.zupt`, in genuine
Zupt format. Obtain it from the release pages linked above, together with
`SHA256SUMS`, its detached GPG signature, `INTEGRITY.json` and its signature.
Forge-generated source downloads are separate from this uploaded package.

Confirm the full GPG fingerprint independently:
`0CFA43B9AA9642EAAF2BE983C4C661C9ECFB46E8`. Run the GPG, checksum, `zupt test`
and extraction commands shown above. Verify the annotated `v0.2.0` tag and its
commit in a source clone, then compare their identities with the authenticated
integrity record.

Zupt 5.2.10 preserves file bytes but does not preserve POSIX modes. After the
archive's GPG-authenticated checksum passes, the Python snippet above restores
only regular 0644/0755 modes from its authenticated manifest. Do not regenerate
a snapshot to make an altered extraction pass. Then run the CodeMark command
using both public fingerprints and the checkpoint from the separately
GPG-verified `INTEGRITY.json`.

CodeMark 0.4.1 signs the complete integrity manifest with **ML-DSA-87 and
Ed25519**. Its executable hash is listed above. `.codemark/integrity.json`
records file bytes and modes; `.codemark/attestations.json` contains the hybrid
attestation. No provenance comments are inserted into source files. Metadata
and version-control directories are excluded, while `.env`, dependencies and
logs are not automatically excluded. Release staging must contain only the
intended, immutable source tree.

Keep both fingerprints and the latest checkpoint independently of the tree
being verified. Pins found only within that tree do not establish trust.
Verification requires OpenSSL 3.5 or newer with ML-DSA-87 and Ed25519. It checks
the authenticated reference and rollback checkpoint; it does not establish
software quality or a trusted timestamp. Observed release validation is recorded
in [VERIFICATION.md](VERIFICATION.md).
